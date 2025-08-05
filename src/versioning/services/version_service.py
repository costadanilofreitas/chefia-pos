# /home/ubuntu/pos-modern/src/versioning/services/version_service.py

import os
import json
import shutil
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import semver

from ..models.version_models import (
    VersionInfo,
    SystemVersion,
    UpdateRequest,
    UpdateResult,
    UpdateCheckResult,
)

# Configuration
VERSION_CONFIG_FILE = os.path.join("/home/ubuntu/pos-modern/config", "version.json")
VERSION_API_URL = (
    "https://api.example.com/pos-modern/versions"  # Replace with actual API URL
)
BACKUP_DIR = os.path.join("/home/ubuntu", "pos-modern-backups")
DOWNLOAD_DIR = os.path.join("/home/ubuntu", "pos-modern-updates")
SYSTEM_DIR = os.path.join("/home/ubuntu", "pos-modern")

# Ensure directories exist
os.makedirs(BACKUP_DIR, exist_ok=True)
os.makedirs(DOWNLOAD_DIR, exist_ok=True)


class VersionService:
    """Service for managing system versioning and updates."""

    def __init__(self):
        """Initialize the version service."""
        self._load_or_create_config()

    def _load_or_create_config(self) -> None:
        """Load existing version config or create a new one if it doesn't exist."""
        if os.path.exists(VERSION_CONFIG_FILE):
            with open(VERSION_CONFIG_FILE, "r") as f:
                config_data = json.load(f)
                self.system_version = SystemVersion(**config_data)
        else:
            # Create default config with current version
            os.makedirs(os.path.dirname(VERSION_CONFIG_FILE), exist_ok=True)
            self.system_version = SystemVersion(
                current_version="0.1.0",  # Initial version
                last_update=datetime.utcnow(),
                update_history=[
                    {
                        "version": "0.1.0",
                        "date": datetime.utcnow().isoformat(),
                        "success": True,
                    }
                ],
            )
            self._save_config()

    def _save_config(self) -> None:
        """Save the current version configuration."""
        with open(VERSION_CONFIG_FILE, "w") as f:
            json.dump(self.system_version.dict(), f, indent=2, default=str)

    async def get_current_version(self) -> SystemVersion:
        """Get the current system version information."""
        return self.system_version

    async def check_for_updates(self, force: bool = False) -> UpdateCheckResult:
        """
        Check if updates are available.

        Args:
            force: If True, bypass the update check interval

        Returns:
            UpdateCheckResult: Result of the update check
        """
        # Check if we should check for updates based on the interval
        should_check = force
        if not should_check and self.system_version.last_update_check:
            last_check = datetime.fromisoformat(
                str(self.system_version.last_update_check)
            )
            hours_since_check = (datetime.utcnow() - last_check).total_seconds() / 3600
            should_check = (
                hours_since_check >= self.system_version.update_check_interval_hours
            )

        if not should_check:
            # Return current status without checking
            return UpdateCheckResult(
                update_available=self.system_version.update_available,
                current_version=self.system_version.current_version,
                latest_version=self.system_version.available_version,
                is_critical=self.system_version.is_critical_update,
                description=self.system_version.update_description,
            )

        try:
            # In a real implementation, this would make an API call to check for updates
            # For this example, we'll simulate the API response
            latest_version = await self._get_latest_version_info()

            # Update the system version info
            self.system_version.last_update_check = datetime.utcnow()

            if (
                latest_version
                and semver.compare(
                    latest_version.version, self.system_version.current_version
                )
                > 0
            ):
                self.system_version.update_available = True
                self.system_version.available_version = latest_version.version
                self.system_version.update_description = latest_version.description
                self.system_version.is_critical_update = latest_version.is_critical

                result = UpdateCheckResult(
                    update_available=True,
                    current_version=self.system_version.current_version,
                    latest_version=latest_version.version,
                    is_critical=latest_version.is_critical,
                    description=latest_version.description,
                    changelog=latest_version.changelog,
                )
            else:
                self.system_version.update_available = False
                self.system_version.available_version = None
                self.system_version.update_description = None
                self.system_version.is_critical_update = False

                result = UpdateCheckResult(
                    update_available=False,
                    current_version=self.system_version.current_version,
                )

            self._save_config()
            return result

        except Exception as e:
            # Log the error
            print(f"Error checking for updates: {str(e)}")

            # Return current status
            return UpdateCheckResult(
                update_available=self.system_version.update_available,
                current_version=self.system_version.current_version,
                latest_version=self.system_version.available_version,
                is_critical=self.system_version.is_critical_update,
                description=self.system_version.update_description,
            )

    async def _get_latest_version_info(self) -> Optional[VersionInfo]:
        """
        Get information about the latest available version.

        In a real implementation, this would make an API call to get the latest version.
        For this example, we'll simulate the API response.

        Returns:
            VersionInfo or None: Information about the latest version, or None if not available
        """
        try:
            # Simulate API call
            # In a real implementation, this would be:
            # response = requests.get(f"{VERSION_API_URL}/latest")
            # if response.status_code == 200:
            #     return VersionInfo(**response.json())

            # For this example, we'll return a simulated latest version
            current_version = semver.parse(self.system_version.current_version)
            latest_version = f"{current_version['major']}.{current_version['minor']}.{current_version['patch'] + 1}"

            return VersionInfo(
                version=latest_version,
                release_date=datetime.utcnow(),
                description="Bug fixes and performance improvements",
                changelog=[
                    "Fixed issue with order processing",
                    "Improved performance of KDS module",
                    "Added new reporting features",
                ],
                is_critical=False,
                modules_affected=["pos", "kds", "kiosk"],
                file_url=f"https://example.com/updates/pos-modern-{latest_version}.zip",
                file_hash=f"sha256:{hashlib.sha256(latest_version.encode()).hexdigest()}",
                installation_steps=[
                    {"type": "backup", "path": SYSTEM_DIR},
                    {
                        "type": "extract",
                        "source": f"pos-modern-{latest_version}.zip",
                        "destination": SYSTEM_DIR,
                    },
                    {"type": "run", "command": "npm install"},
                    {"type": "run", "command": "pip install -r requirements.txt"},
                ],
                rollback_steps=[{"type": "restore", "path": SYSTEM_DIR}],
            )
        except Exception as e:
            print(f"Error getting latest version info: {str(e)}")
            return None

    async def get_version_info(self, version: str) -> Optional[VersionInfo]:
        """
        Get information about a specific version.

        Args:
            version: The version to get information for

        Returns:
            VersionInfo or None: Information about the specified version, or None if not available
        """
        try:
            # In a real implementation, this would make an API call to get the version info
            # For this example, we'll simulate the API response
            if version == self.system_version.current_version:
                return VersionInfo(
                    version=version,
                    release_date=datetime.utcnow() - timedelta(days=30),
                    description="Current version",
                    changelog=["Initial release"],
                    is_critical=False,
                    modules_affected=["pos", "kds", "kiosk"],
                    file_url=None,
                    file_hash=None,
                    installation_steps=[],
                    rollback_steps=[],
                )
            elif (
                self.system_version.available_version
                and version == self.system_version.available_version
            ):
                return await self._get_latest_version_info()
            else:
                return None
        except Exception as e:
            print(f"Error getting version info: {str(e)}")
            return None

    async def update_system(self, request: UpdateRequest) -> UpdateResult:
        """
        Update the system to the specified version.

        Args:
            request: The update request

        Returns:
            UpdateResult: Result of the update operation
        """
        # Get the target version
        target_version = request.target_version or self.system_version.available_version

        if not target_version:
            return UpdateResult(
                success=False,
                message="No target version specified and no updates available",
                from_version=self.system_version.current_version,
            )

        # Get information about the target version
        version_info = await self.get_version_info(target_version)

        if not version_info:
            return UpdateResult(
                success=False,
                message=f"Version information not available for {target_version}",
                from_version=self.system_version.current_version,
            )

        # Check if the update is allowed
        if not request.force:
            # Check if the current version meets the minimum required version
            if (
                version_info.min_required_version
                and semver.compare(
                    self.system_version.current_version,
                    version_info.min_required_version,
                )
                < 0
            ):
                return UpdateResult(
                    success=False,
                    message=f"Current version {self.system_version.current_version} does not meet the minimum required version {version_info.min_required_version}",
                    from_version=self.system_version.current_version,
                    to_version=target_version,
                    details={"min_required_version": version_info.min_required_version},
                )

        # Perform the update
        try:
            # Create a backup
            backup_path = await self._create_backup()

            # Download the update package
            if version_info.file_url:
                download_path = await self._download_update(version_info.file_url)

                # Verify the hash
                if version_info.file_hash and not await self._verify_hash(
                    download_path, version_info.file_hash
                ):
                    return UpdateResult(
                        success=False,
                        message=f"Hash verification failed for {target_version}",
                        from_version=self.system_version.current_version,
                        to_version=target_version,
                        details={"backup_path": backup_path},
                    )

                # Extract the update package
                await self._extract_update(download_path)

            # Run installation steps
            for step in version_info.installation_steps:
                if step["type"] == "run":
                    await self._run_command(step["command"])

            # Update the system version
            old_version = self.system_version.current_version
            self.system_version.current_version = target_version
            self.system_version.last_update = datetime.utcnow()
            self.system_version.update_available = False
            self.system_version.available_version = None
            self.system_version.update_description = None
            self.system_version.is_critical_update = False

            # Add to update history
            self.system_version.update_history.append(
                {
                    "version": target_version,
                    "date": datetime.utcnow().isoformat(),
                    "success": True,
                }
            )

            self._save_config()

            return UpdateResult(
                success=True,
                message=f"Successfully updated from {old_version} to {target_version}",
                from_version=old_version,
                to_version=target_version,
                details={"backup_path": backup_path},
            )

        except Exception as e:
            # Log the error
            error_message = f"Error updating system: {str(e)}"
            print(error_message)

            # Add to update history
            self.system_version.update_history.append(
                {
                    "version": target_version,
                    "date": datetime.utcnow().isoformat(),
                    "success": False,
                    "error": error_message,
                }
            )

            self._save_config()

            return UpdateResult(
                success=False,
                message=error_message,
                from_version=self.system_version.current_version,
                to_version=target_version,
            )

    async def _create_backup(self) -> str:
        """
        Create a backup of the system.

        Returns:
            str: Path to the backup directory
        """
        timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
        backup_path = os.path.join(BACKUP_DIR, f"pos-modern-backup-{timestamp}")

        # Create the backup directory
        os.makedirs(backup_path, exist_ok=True)

        # Copy the system files to the backup directory
        for item in os.listdir(SYSTEM_DIR):
            source = os.path.join(SYSTEM_DIR, item)
            destination = os.path.join(backup_path, item)

            if os.path.isdir(source):
                shutil.copytree(source, destination)
            else:
                shutil.copy2(source, destination)

        return backup_path

    async def _download_update(self, url: str) -> str:
        """
        Download an update package.

        Args:
            url: URL to download the update package from

        Returns:
            str: Path to the downloaded file
        """
        # In a real implementation, this would download the file from the URL
        # For this example, we'll simulate the download
        filename = url.split("/")[-1]
        download_path = os.path.join(DOWNLOAD_DIR, filename)

        # Simulate download by creating an empty file
        with open(download_path, "w") as f:
            f.write("Simulated update package")

        return download_path

    async def _verify_hash(self, file_path: str, expected_hash: str) -> bool:
        """
        Verify the hash of a file.

        Args:
            file_path: Path to the file to verify
            expected_hash: Expected hash in the format "algorithm:hash"

        Returns:
            bool: True if the hash matches, False otherwise
        """
        # Parse the expected hash
        algorithm, expected = expected_hash.split(":", 1)

        # Calculate the hash
        with open(file_path, "rb") as f:
            if algorithm.lower() == "sha256":
                actual = hashlib.sha256(f.read()).hexdigest()
            elif algorithm.lower() == "md5":
                actual = hashlib.md5(f.read()).hexdigest()
            else:
                raise ValueError(f"Unsupported hash algorithm: {algorithm}")

        return actual == expected

    async def _extract_update(self, file_path: str) -> None:
        """
        Extract an update package.

        Args:
            file_path: Path to the update package
        """
        # In a real implementation, this would extract the update package
        # For this example, we'll simulate the extraction
        print(f"Simulating extraction of {file_path}")

    async def _run_command(self, command: str) -> Tuple[int, str, str]:
        """
        Run a command.

        Args:
            command: Command to run

        Returns:
            Tuple[int, str, str]: Return code, stdout, stderr
        """
        # In a real implementation, this would run the command
        # For this example, we'll simulate running the command
        print(f"Simulating running command: {command}")
        return 0, "Simulated stdout", ""

    async def restore_backup(self, backup_path: str) -> UpdateResult:
        """
        Restore the system from a backup.

        Args:
            backup_path: Path to the backup directory

        Returns:
            UpdateResult: Result of the restore operation
        """
        try:
            # Check if the backup exists
            if not os.path.exists(backup_path) or not os.path.isdir(backup_path):
                return UpdateResult(
                    success=False,
                    message=f"Backup not found: {backup_path}",
                    from_version=self.system_version.current_version,
                )

            # Create a backup of the current state before restoring
            current_backup = await self._create_backup()

            # Clear the system directory
            for item in os.listdir(SYSTEM_DIR):
                path = os.path.join(SYSTEM_DIR, item)
                if os.path.isdir(path):
                    shutil.rmtree(path)
                else:
                    os.remove(path)

            # Copy the backup files to the system directory
            for item in os.listdir(backup_path):
                source = os.path.join(backup_path, item)
                destination = os.path.join(SYSTEM_DIR, item)

                if os.path.isdir(source):
                    shutil.copytree(source, destination)
                else:
                    shutil.copy2(source, destination)

            # Load the version config from the backup
            backup_config_file = os.path.join(backup_path, "config", "version.json")
            if os.path.exists(backup_config_file):
                with open(backup_config_file, "r") as f:
                    backup_config = json.load(f)
                    restored_version = backup_config.get(
                        "current_version", self.system_version.current_version
                    )
            else:
                restored_version = self.system_version.current_version

            # Update the system version
            old_version = self.system_version.current_version
            self.system_version.current_version = restored_version
            self.system_version.last_update = datetime.utcnow()

            # Add to update history
            self.system_version.update_history.append(
                {
                    "version": restored_version,
                    "date": datetime.utcnow().isoformat(),
                    "success": True,
                    "type": "restore",
                    "backup_path": backup_path,
                }
            )

            self._save_config()

            return UpdateResult(
                success=True,
                message=f"Successfully restored from backup to version {restored_version}",
                from_version=old_version,
                to_version=restored_version,
                details={
                    "backup_path": backup_path,
                    "previous_state_backup": current_backup,
                },
            )

        except Exception as e:
            # Log the error
            error_message = f"Error restoring from backup: {str(e)}"
            print(error_message)

            return UpdateResult(
                success=False,
                message=error_message,
                from_version=self.system_version.current_version,
            )

    async def set_auto_update(self, enabled: bool) -> SystemVersion:
        """
        Enable or disable automatic updates.

        Args:
            enabled: Whether automatic updates should be enabled

        Returns:
            SystemVersion: Updated system version information
        """
        self.system_version.auto_update_enabled = enabled
        self._save_config()
        return self.system_version

    async def set_update_check_interval(self, hours: int) -> SystemVersion:
        """
        Set the interval for checking for updates.

        Args:
            hours: Number of hours between update checks

        Returns:
            SystemVersion: Updated system version information
        """
        self.system_version.update_check_interval_hours = max(
            1, hours
        )  # Minimum 1 hour
        self._save_config()
        return self.system_version

    async def get_update_history(self) -> List[Dict[str, Any]]:
        """
        Get the update history.

        Returns:
            List[Dict[str, Any]]: List of update history entries
        """
        return self.system_version.update_history


# Create a singleton instance
version_service = VersionService()
