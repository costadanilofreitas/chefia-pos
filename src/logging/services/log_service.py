# /home/ubuntu/pos-modern/src/logging/services/log_service.py

import os
import json
import logging
import logging.handlers
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timedelta
import uuid
import re
import asyncio
from collections import Counter, defaultdict

from ..models.log_models import LogEntry, LogQuery, LogStats, LogConfig, LogLevel, LogSource

# Configuration
LOG_CONFIG_FILE = os.path.join("/home/ubuntu/pos-modern/config", "logging.json")
LOG_DATA_DIR = os.path.join("/home/ubuntu/pos-modern/data", "logs")
LOG_FILE_PATH = os.path.join("/var/log/pos-modern", "app.log")

# Ensure directories exist
os.makedirs(os.path.dirname(LOG_CONFIG_FILE), exist_ok=True)
os.makedirs(LOG_DATA_DIR, exist_ok=True)
os.makedirs(os.path.dirname(LOG_FILE_PATH), exist_ok=True)

class LogService:
    """Service for managing system logs."""
    
    def __init__(self):
        """Initialize the log service."""
        self._load_or_create_config()
        self._setup_logging()
        self._in_memory_logs = []  # Recent logs kept in memory for quick access
        self._log_files = {}  # Cache of log files by date
    
    def _load_or_create_config(self) -> None:
        """Load existing log config or create a new one if it doesn't exist."""
        if os.path.exists(LOG_CONFIG_FILE):
            with open(LOG_CONFIG_FILE, 'r') as f:
                config_data = json.load(f)
                self.log_config = LogConfig(**config_data)
        else:
            # Create default config
            self.log_config = LogConfig()
            self._save_config()
    
    def _save_config(self) -> None:
        """Save the current log configuration."""
        with open(LOG_CONFIG_FILE, 'w') as f:
            json.dump(self.log_config.dict(), f, indent=2, default=str)
    
    def _setup_logging(self) -> None:
        """Set up Python logging based on configuration."""
        # Reset handlers
        root_logger = logging.getLogger()
        for handler in root_logger.handlers[:]:
            root_logger.removeHandler(handler)
        
        # Set level
        level_map = {
            LogLevel.DEBUG: logging.DEBUG,
            LogLevel.INFO: logging.INFO,
            LogLevel.WARNING: logging.WARNING,
            LogLevel.ERROR: logging.ERROR,
            LogLevel.CRITICAL: logging.CRITICAL
        }
        root_logger.setLevel(level_map.get(self.log_config.default_level, logging.INFO))
        
        # Add console handler if enabled
        if self.log_config.console_logging:
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            ))
            root_logger.addHandler(console_handler)
        
        # Add file handler if enabled
        if self.log_config.file_logging:
            if self.log_config.log_rotation:
                file_handler = logging.handlers.RotatingFileHandler(
                    self.log_config.log_file_path,
                    maxBytes=self.log_config.log_rotation_size_mb * 1024 * 1024,
                    backupCount=self.log_config.log_rotation_count
                )
            else:
                file_handler = logging.FileHandler(self.log_config.log_file_path)
            
            file_handler.setFormatter(logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            ))
            root_logger.addHandler(file_handler)
    
    async def log(self, entry: LogEntry) -> LogEntry:
        """
        Log an entry to the system.
        
        Args:
            entry: The log entry to record
            
        Returns:
            LogEntry: The recorded log entry with ID and timestamp
        """
        if not self.log_config.enabled:
            return entry
        
        # Skip excluded sources and levels
        if entry.source in self.log_config.excluded_sources or entry.level in self.log_config.excluded_levels:
            return entry
        
        # Ensure ID and timestamp
        if not entry.id:
            entry.id = str(uuid.uuid4())
        if not entry.timestamp:
            entry.timestamp = datetime.utcnow()
        
        # Add to in-memory cache
        self._in_memory_logs.append(entry.dict())
        if len(self._in_memory_logs) > 1000:  # Limit in-memory logs
            self._in_memory_logs.pop(0)
        
        # Write to log file
        await self._write_log_to_file(entry)
        
        # Log using Python's logging module
        if entry.level == LogLevel.DEBUG:
            logging.debug(entry.message, extra={"log_entry": entry.dict()})
        elif entry.level == LogLevel.INFO:
            logging.info(entry.message, extra={"log_entry": entry.dict()})
        elif entry.level == LogLevel.WARNING:
            logging.warning(entry.message, extra={"log_entry": entry.dict()})
        elif entry.level == LogLevel.ERROR:
            logging.error(entry.message, extra={"log_entry": entry.dict()})
        elif entry.level == LogLevel.CRITICAL:
            logging.critical(entry.message, extra={"log_entry": entry.dict()})
        
        return entry
    
    async def _write_log_to_file(self, entry: LogEntry) -> None:
        """
        Write a log entry to the appropriate log file.
        
        Args:
            entry: The log entry to write
        """
        # Create a date-based filename
        date_str = entry.timestamp.strftime("%Y-%m-%d")
        log_file = os.path.join(LOG_DATA_DIR, f"log_{date_str}.jsonl")
        
        # Append to the log file
        with open(log_file, 'a') as f:
            f.write(json.dumps(entry.dict(), default=str) + "\n")
    
    async def query_logs(self, query: LogQuery) -> List[LogEntry]:
        """
        Query logs based on criteria.
        
        Args:
            query: The query parameters
            
        Returns:
            List[LogEntry]: Matching log entries
        """
        # Start with in-memory logs for recent entries
        results = []
        
        # Determine date range for file-based search
        start_date = query.start_date or (datetime.utcnow() - timedelta(days=7))
        end_date = query.end_date or datetime.utcnow()
        
        # Convert to date objects for file matching
        start_date_only = start_date.date()
        end_date_only = end_date.date()
        
        # Get logs from files within date range
        current_date = start_date_only
        while current_date <= end_date_only:
            date_str = current_date.strftime("%Y-%m-%d")
            log_file = os.path.join(LOG_DATA_DIR, f"log_{date_str}.jsonl")
            
            if os.path.exists(log_file):
                file_logs = await self._read_logs_from_file(log_file)
                results.extend(file_logs)
            
            current_date += timedelta(days=1)
        
        # Add in-memory logs that might not be in files yet
        for log_dict in self._in_memory_logs:
            log_timestamp = datetime.fromisoformat(log_dict["timestamp"]) if isinstance(log_dict["timestamp"], str) else log_dict["timestamp"]
            if start_date <= log_timestamp <= end_date:
                # Check if this log is already in results (avoid duplicates)
                if not any(r["id"] == log_dict["id"] for r in results):
                    results.append(log_dict)
        
        # Apply filters
        filtered_results = []
        for log_dict in results:
            if self._matches_query(log_dict, query):
                filtered_results.append(log_dict)
        
        # Sort results
        if query.sort_by:
            reverse = query.sort_order.lower() == "desc"
            filtered_results.sort(key=lambda x: x.get(query.sort_by, ""), reverse=reverse)
        
        # Apply pagination
        paginated_results = filtered_results[query.offset:query.offset + query.limit]
        
        # Convert to LogEntry objects
        return [LogEntry(**log_dict) for log_dict in paginated_results]
    
    async def _read_logs_from_file(self, file_path: str) -> List[Dict[str, Any]]:
        """
        Read logs from a file.
        
        Args:
            file_path: Path to the log file
            
        Returns:
            List[Dict[str, Any]]: Log entries from the file
        """
        # Check if we have this file cached
        if file_path in self._log_files:
            return self._log_files[file_path]
        
        logs = []
        try:
            with open(file_path, 'r') as f:
                for line in f:
                    try:
                        log_dict = json.loads(line.strip())
                        logs.append(log_dict)
                    except json.JSONDecodeError:
                        # Skip invalid lines
                        continue
            
            # Cache the logs
            self._log_files[file_path] = logs
            
            # Limit cache size
            if len(self._log_files) > 10:
                # Remove oldest file from cache
                oldest_file = min(self._log_files.keys(), key=lambda k: os.path.getmtime(k))
                del self._log_files[oldest_file]
            
            return logs
        except Exception as e:
            print(f"Error reading log file {file_path}: {str(e)}")
            return []
    
    def _matches_query(self, log_dict: Dict[str, Any], query: LogQuery) -> bool:
        """
        Check if a log entry matches the query criteria.
        
        Args:
            log_dict: The log entry as a dictionary
            query: The query parameters
            
        Returns:
            bool: True if the log matches the query, False otherwise
        """
        # Check timestamp
        if query.start_date or query.end_date:
            log_timestamp = datetime.fromisoformat(log_dict["timestamp"]) if isinstance(log_dict["timestamp"], str) else log_dict["timestamp"]
            
            if query.start_date and log_timestamp < query.start_date:
                return False
            
            if query.end_date and log_timestamp > query.end_date:
                return False
        
        # Check level
        if query.levels and log_dict.get("level") not in [level.value for level in query.levels]:
            return False
        
        # Check source
        if query.sources and log_dict.get("source") not in [source.value for source in query.sources]:
            return False
        
        # Check module
        if query.modules and log_dict.get("module") not in query.modules:
            return False
        
        # Check user_id
        if query.user_id and log_dict.get("user_id") != query.user_id:
            return False
        
        # Check user_name
        if query.user_name and log_dict.get("user_name") != query.user_name:
            return False
        
        # Check ip_address
        if query.ip_address and log_dict.get("ip_address") != query.ip_address:
            return False
        
        # Check session_id
        if query.session_id and log_dict.get("session_id") != query.session_id:
            return False
        
        # Check search_text
        if query.search_text:
            search_text = query.search_text.lower()
            message = log_dict.get("message", "").lower()
            details_str = json.dumps(log_dict.get("details", {})).lower()
            
            if search_text not in message and search_text not in details_str:
                return False
        
        # Check tags
        if query.tags:
            log_tags = log_dict.get("tags", [])
            if not all(tag in log_tags for tag in query.tags):
                return False
        
        return True
    
    async def get_log_stats(self, query: Optional[LogQuery] = None) -> LogStats:
        """
        Get statistics about logs.
        
        Args:
            query: Optional query to filter logs for statistics
            
        Returns:
            LogStats: Statistics about the logs
        """
        # Get logs matching the query
        logs = await self.query_logs(query or LogQuery(limit=10000))
        
        # Convert to dictionaries for easier processing
        log_dicts = [log.dict() for log in logs]
        
        # Calculate statistics
        total_entries = len(log_dicts)
        
        # Count by level
        entries_by_level = Counter(log.level for log in logs)
        
        # Count by source
        entries_by_source = Counter(log.source for log in logs)
        
        # Count by module
        entries_by_module = Counter(log.module for log in logs)
        
        # Count by hour
        entries_by_hour = defaultdict(int)
        for log in logs:
            hour = log.timestamp.strftime("%H")
            entries_by_hour[hour] += 1
        
        # Most common tags
        all_tags = []
        for log in logs:
            all_tags.extend(log.tags)
        most_common_tags = [{"tag": tag, "count": count} for tag, count in Counter(all_tags).most_common(10)]
        
        # Most active users
        user_counts = defaultdict(lambda: {"count": 0, "user_name": ""})
        for log in logs:
            if log.user_id:
                user_counts[log.user_id]["count"] += 1
                user_counts[log.user_id]["user_name"] = log.user_name or ""
        
        most_active_users = [
            {"user_id": user_id, "user_name": data["user_name"], "count": data["count"]}
            for user_id, data in sorted(user_counts.items(), key=lambda x: x[1]["count"], reverse=True)[:10]
        ]
        
        # Most common errors
        error_logs = [log for log in logs if log.level in [LogLevel.ERROR, LogLevel.CRITICAL]]
        error_messages = [log.message for log in error_logs]
        most_common_errors = [{"message": msg, "count": count} for msg, count in Counter(error_messages).most_common(10)]
        
        return LogStats(
            total_entries=total_entries,
            entries_by_level={level.value: entries_by_level.get(level, 0) for level in LogLevel},
            entries_by_source={source.value: entries_by_source.get(source, 0) for source in LogSource},
            entries_by_module=dict(entries_by_module),
            entries_by_hour=dict(entries_by_hour),
            most_common_tags=most_common_tags,
            most_active_users=most_active_users,
            most_common_errors=most_common_errors
        )
    
    async def get_log_config(self) -> LogConfig:
        """
        Get the current log configuration.
        
        Returns:
            LogConfig: The current log configuration
        """
        return self.log_config
    
    async def update_log_config(self, config: LogConfig) -> LogConfig:
        """
        Update the log configuration.
        
        Args:
            config: The new log configuration
            
        Returns:
            LogConfig: The updated log configuration
        """
        self.log_config = config
        self._save_config()
        self._setup_logging()
        return self.log_config
    
    async def clear_logs(self, days_to_keep: int = 0) -> Dict[str, Any]:
        """
        Clear logs older than the specified number of days.
        
        Args:
            days_to_keep: Number of days of logs to keep (0 means clear all)
            
        Returns:
            Dict[str, Any]: Result of the operation
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_to_keep)
        cutoff_date_str = cutoff_date.strftime("%Y-%m-%d")
        
        files_removed = 0
        entries_removed = 0
        
        # Clear log files
        for filename in os.listdir(LOG_DATA_DIR):
            if not filename.startswith("log_") or not filename.endswith(".jsonl"):
                continue
            
            # Extract date from filename
            match = re.match(r"log_(\d{4}-\d{2}-\d{2})\.jsonl", filename)
            if not match:
                continue
            
            file_date_str = match.group(1)
            
            if file_date_str < cutoff_date_str:
                file_path = os.path.join(LOG_DATA_DIR, filename)
                
                # Count entries in the file
                try:
                    with open(file_path, 'r') as f:
                        file_entries = sum(1 for _ in f)
                    entries_removed += file_entries
                except:
                    pass
                
                # Remove the file
                try:
                    os.remove(file_path)
                    files_removed += 1
                    
                    # Remove from cache if present
                    if file_path in self._log_files:
                        del self._log_files[file_path]
                except Exception as e:
                    print(f"Error removing log file {file_path}: {str(e)}")
        
        # Clear in-memory logs
        self._in_memory_logs = [
            log for log in self._in_memory_logs
            if (datetime.fromisoformat(log["timestamp"]) if isinstance(log["timestamp"], str) else log["timestamp"]) >= cutoff_date
        ]
        
        return {
            "success": True,
            "files_removed": files_removed,
            "entries_removed": entries_removed,
            "cutoff_date": cutoff_date.isoformat()
        }
    
    async def export_logs(self, query: LogQuery, format: str = "json") -> str:
        """
        Export logs to a file.
        
        Args:
            query: Query to filter logs for export
            format: Export format ("json", "csv", or "txt")
            
        Returns:
            str: Path to the exported file
        """
        # Get logs matching the query
        logs = await self.query_logs(query)
        
        # Create export directory if it doesn't exist
        export_dir = os.path.join("/home/ubuntu/pos-modern/data", "exports")
        os.makedirs(export_dir, exist_ok=True)
        
        # Generate filename
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        filename = f"logs_export_{timestamp}.{format}"
        export_path = os.path.join(export_dir, filename)
        
        if format == "json":
            # Export as JSON
            with open(export_path, 'w') as f:
                json.dump([log.dict() for log in logs], f, indent=2, default=str)
        
        elif format == "csv":
            # Export as CSV
            import csv
            with open(export_path, 'w', newline='') as f:
                writer = csv.writer(f)
                
                # Write header
                writer.writerow([
                    "id", "timestamp", "level", "source", "module", "message",
                    "user_id", "user_name", "ip_address", "session_id", "tags"
                ])
                
                # Write data
                for log in logs:
                    writer.writerow([
                        log.id,
                        log.timestamp.isoformat(),
                        log.level,
                        log.source,
                        log.module,
                        log.message,
                        log.user_id or "",
                        log.user_name or "",
                        log.ip_address or "",
                        log.session_id or "",
                        ",".join(log.tags)
                    ])
        
        else:  # txt
            # Export as plain text
            with open(export_path, 'w') as f:
                for log in logs:
                    f.write(f"[{log.timestamp.isoformat()}] [{log.level.upper()}] [{log.source}] [{log.module}] {log.message}\n")
                    if log.details:
                        f.write(f"  Details: {json.dumps(log.details, default=str)}\n")
                    if log.user_id or log.user_name:
                        f.write(f"  User: {log.user_name or ''} ({log.user_id or ''})\n")
                    if log.ip_address:
                        f.write(f"  IP: {log.ip_address}\n")
                    if log.session_id:
                        f.write(f"  Session: {log.session_id}\n")
                    if log.tags:
                        f.write(f"  Tags: {', '.join(log.tags)}\n")
                    f.write("\n")
        
        return export_path

# Create a singleton instance
log_service = LogService()

# Helper functions for easy logging
async def log_debug(message: str, source: Union[LogSource, str], module: str, **kwargs) -> LogEntry:
    """Helper function to log a debug message."""
    entry = LogEntry(
        level=LogLevel.DEBUG,
        source=source if isinstance(source, LogSource) else source,
        module=module,
        message=message,
        **kwargs
    )
    return await log_service.log(entry)

async def log_info(message: str, source: Union[LogSource, str], module: str, **kwargs) -> LogEntry:
    """Helper function to log an info message."""
    entry = LogEntry(
        level=LogLevel.INFO,
        source=source if isinstance(source, LogSource) else source,
        module=module,
        message=message,
        **kwargs
    )
    return await log_service.log(entry)

async def log_warning(message: str, source: Union[LogSource, str], module: str, **kwargs) -> LogEntry:
    """Helper function to log a warning message."""
    entry = LogEntry(
        level=LogLevel.WARNING,
        source=source if isinstance(source, LogSource) else source,
        module=module,
        message=message,
        **kwargs
    )
    return await log_service.log(entry)

async def log_error(message: str, source: Union[LogSource, str], module: str, **kwargs) -> LogEntry:
    """Helper function to log an error message."""
    entry = LogEntry(
        level=LogLevel.ERROR,
        source=source if isinstance(source, LogSource) else source,
        module=module,
        message=message,
        **kwargs
    )
    return await log_service.log(entry)

async def log_critical(message: str, source: Union[LogSource, str], module: str, **kwargs) -> LogEntry:
    """Helper function to log a critical message."""
    entry = LogEntry(
        level=LogLevel.CRITICAL,
        source=source if isinstance(source, LogSource) else source,
        module=module,
        message=message,
        **kwargs
    )
    return await log_service.log(entry)
