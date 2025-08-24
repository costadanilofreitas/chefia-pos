# 🔒 Security Guidelines - Chefia POS

## Metadata
- **Version**: 1.0.0
- **Last Updated**: January 2025
- **Compliance**: PCI-DSS, LGPD, ISO 27001
- **Classification**: CONFIDENTIAL

---

## 1. SECURITY PRINCIPLES

### Core Security Requirements
```yaml
principles:
  defense_in_depth: Multiple layers of security controls
  least_privilege: Minimal access rights for users and services
  zero_trust: Never trust, always verify
  data_protection: Encrypt sensitive data at rest and in transit
  audit_trail: Log all security-relevant events
  fail_secure: Default to secure state on failure
```

---

## 2. AUTHENTICATION & AUTHORIZATION

### 2.1 JWT Implementation
```python
# src/auth/jwt_manager.py
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt
from passlib.context import CryptContext
import secrets

class JWTManager:
    """Secure JWT token management."""
    
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.algorithm = "HS256"
        self.access_token_expire = timedelta(minutes=15)
        self.refresh_token_expire = timedelta(days=7)
    
    def create_access_token(
        self,
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create secure access token."""
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or self.access_token_expire)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "jti": secrets.token_urlsafe(32),  # Unique token ID
            "type": "access"
        })
        
        return jwt.encode(to_encode, SECRET_KEY, algorithm=self.algorithm)
    
    def verify_token(self, token: str) -> Dict[str, Any]:
        """Verify and decode token."""
        try:
            payload = jwt.decode(
                token,
                SECRET_KEY,
                algorithms=[self.algorithm]
            )
            
            # Verify token type
            if payload.get("type") != "access":
                raise ValueError("Invalid token type")
            
            # Check blacklist
            if self.is_token_blacklisted(payload.get("jti")):
                raise ValueError("Token has been revoked")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise AuthException("Token expired")
        except jwt.JWTError:
            raise AuthException("Invalid token")
```

### 2.2 Password Security
```python
# src/auth/password_security.py
import re
from typing import List
import hashlib

class PasswordSecurity:
    """Password security policies."""
    
    MIN_LENGTH = 8
    REQUIRE_UPPERCASE = True
    REQUIRE_LOWERCASE = True
    REQUIRE_NUMBERS = True
    REQUIRE_SPECIAL = True
    MAX_REPEATED_CHARS = 3
    
    @classmethod
    def validate_password(cls, password: str) -> List[str]:
        """Validate password against security policies."""
        errors = []
        
        if len(password) < cls.MIN_LENGTH:
            errors.append(f"Password must be at least {cls.MIN_LENGTH} characters")
        
        if cls.REQUIRE_UPPERCASE and not re.search(r"[A-Z]", password):
            errors.append("Password must contain uppercase letters")
        
        if cls.REQUIRE_LOWERCASE and not re.search(r"[a-z]", password):
            errors.append("Password must contain lowercase letters")
        
        if cls.REQUIRE_NUMBERS and not re.search(r"\d", password):
            errors.append("Password must contain numbers")
        
        if cls.REQUIRE_SPECIAL and not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            errors.append("Password must contain special characters")
        
        # Check for common passwords
        if cls.is_common_password(password):
            errors.append("Password is too common")
        
        # Check for repeated characters
        if cls.has_excessive_repetition(password):
            errors.append("Password has too many repeated characters")
        
        return errors
    
    @staticmethod
    def is_common_password(password: str) -> bool:
        """Check against common passwords list."""
        password_hash = hashlib.sha256(password.encode()).hexdigest()
        # Check against pre-computed hashes of common passwords
        return password_hash in COMMON_PASSWORD_HASHES
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt with salt."""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain: str, hashed: str) -> bool:
        """Verify password with timing attack protection."""
        return pwd_context.verify(plain, hashed)
```

### 2.3 Role-Based Access Control (RBAC)
```python
# src/auth/rbac.py
from enum import Enum
from typing import List, Dict, Any

class Role(Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    CASHIER = "cashier"
    WAITER = "waiter"
    KITCHEN = "kitchen"
    CUSTOMER = "customer"

class Permission(Enum):
    # Order permissions
    ORDER_CREATE = "order.create"
    ORDER_READ = "order.read"
    ORDER_UPDATE = "order.update"
    ORDER_DELETE = "order.delete"
    ORDER_CANCEL = "order.cancel"
    
    # Payment permissions
    PAYMENT_PROCESS = "payment.process"
    PAYMENT_REFUND = "payment.refund"
    PAYMENT_VIEW = "payment.view"
    
    # Product permissions
    PRODUCT_CREATE = "product.create"
    PRODUCT_UPDATE = "product.update"
    PRODUCT_DELETE = "product.delete"
    
    # Report permissions
    REPORT_SALES = "report.sales"
    REPORT_FINANCIAL = "report.financial"
    REPORT_INVENTORY = "report.inventory"
    
    # System permissions
    SYSTEM_CONFIG = "system.config"
    SYSTEM_BACKUP = "system.backup"
    USER_MANAGE = "user.manage"

ROLE_PERMISSIONS = {
    Role.ADMIN: [p for p in Permission],  # All permissions
    Role.MANAGER: [
        Permission.ORDER_CREATE,
        Permission.ORDER_READ,
        Permission.ORDER_UPDATE,
        Permission.ORDER_CANCEL,
        Permission.PAYMENT_PROCESS,
        Permission.PAYMENT_REFUND,
        Permission.PAYMENT_VIEW,
        Permission.PRODUCT_UPDATE,
        Permission.REPORT_SALES,
        Permission.REPORT_FINANCIAL,
        Permission.REPORT_INVENTORY
    ],
    Role.CASHIER: [
        Permission.ORDER_CREATE,
        Permission.ORDER_READ,
        Permission.ORDER_UPDATE,
        Permission.PAYMENT_PROCESS,
        Permission.PAYMENT_VIEW,
        Permission.REPORT_SALES
    ],
    Role.WAITER: [
        Permission.ORDER_CREATE,
        Permission.ORDER_READ,
        Permission.ORDER_UPDATE
    ],
    Role.KITCHEN: [
        Permission.ORDER_READ,
        Permission.ORDER_UPDATE
    ],
    Role.CUSTOMER: [
        Permission.ORDER_READ
    ]
}

def check_permission(user_role: Role, required_permission: Permission) -> bool:
    """Check if role has required permission."""
    return required_permission in ROLE_PERMISSIONS.get(user_role, [])
```

---

## 3. DATA PROTECTION

### 3.1 Encryption at Rest
```python
# src/security/encryption.py
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2
import base64
import os

class DataEncryption:
    """Data encryption service."""
    
    def __init__(self, master_key: str = None):
        if master_key:
            self.key = self._derive_key(master_key)
        else:
            self.key = self._load_or_generate_key()
        
        self.cipher = Fernet(self.key)
    
    def _derive_key(self, password: str) -> bytes:
        """Derive encryption key from password."""
        kdf = PBKDF2(
            algorithm=hashes.SHA256(),
            length=32,
            salt=os.environ.get("ENCRYPTION_SALT", b"stable_salt"),
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
        return key
    
    def encrypt_sensitive_data(self, data: str) -> str:
        """Encrypt sensitive data."""
        return self.cipher.encrypt(data.encode()).decode()
    
    def decrypt_sensitive_data(self, encrypted: str) -> str:
        """Decrypt sensitive data."""
        return self.cipher.decrypt(encrypted.encode()).decode()
    
    def encrypt_pii(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Encrypt PII fields in data."""
        pii_fields = ["cpf", "cnpj", "phone", "email", "address"]
        encrypted_data = data.copy()
        
        for field in pii_fields:
            if field in encrypted_data and encrypted_data[field]:
                encrypted_data[field] = self.encrypt_sensitive_data(
                    str(encrypted_data[field])
                )
        
        return encrypted_data
```

### 3.2 Encryption in Transit
```python
# src/security/tls_config.py
SSL_CONFIG = {
    "minimum_version": "TLSv1.2",
    "ciphers": [
        "ECDHE-RSA-AES256-GCM-SHA384",
        "ECDHE-RSA-AES128-GCM-SHA256",
        "AES256-GCM-SHA384",
        "AES128-GCM-SHA256"
    ],
    "certificate_path": "/etc/ssl/certs/chefia-pos.crt",
    "private_key_path": "/etc/ssl/private/chefia-pos.key",
    "dhparam_path": "/etc/ssl/certs/dhparam.pem",
    "hsts_max_age": 31536000,
    "force_https": True
}

# FastAPI HTTPS configuration
from fastapi import FastAPI
import uvicorn

app = FastAPI()

if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=443,
        ssl_keyfile=SSL_CONFIG["private_key_path"],
        ssl_certfile=SSL_CONFIG["certificate_path"],
        ssl_version=ssl.PROTOCOL_TLSv1_2,
        ssl_ciphers=":".join(SSL_CONFIG["ciphers"])
    )
```

---

## 4. INPUT VALIDATION & SANITIZATION

### 4.1 SQL Injection Prevention
```python
# src/security/sql_injection.py
from sqlalchemy import text
from typing import Any, Dict

class SQLSecurity:
    """SQL injection prevention."""
    
    @staticmethod
    def safe_query(query: str, params: Dict[str, Any]):
        """Execute query with parameterized inputs."""
        # NEVER do string concatenation
        # BAD: f"SELECT * FROM users WHERE id = {user_id}"
        
        # GOOD: Use parameterized queries
        safe_query = text(query)
        return db.execute(safe_query, params)
    
    @staticmethod
    def validate_table_name(table: str) -> bool:
        """Validate table name against whitelist."""
        ALLOWED_TABLES = [
            "orders", "products", "customers", "payments",
            "users", "sessions", "audit_logs"
        ]
        return table in ALLOWED_TABLES
    
    @staticmethod
    def escape_like_pattern(pattern: str) -> str:
        """Escape special characters in LIKE patterns."""
        return pattern.replace("%", "\\%").replace("_", "\\_")
```

### 4.2 XSS Prevention
```python
# src/security/xss_prevention.py
import html
import re
from typing import Any

class XSSPrevention:
    """Cross-site scripting prevention."""
    
    @staticmethod
    def sanitize_html(content: str) -> str:
        """Sanitize HTML content."""
        # Escape HTML entities
        sanitized = html.escape(content)
        
        # Remove script tags
        sanitized = re.sub(r'<script[^>]*>.*?</script>', '', sanitized, flags=re.DOTALL)
        
        # Remove event handlers
        sanitized = re.sub(r'on\w+\s*=\s*["\'][^"\']*["\']', '', sanitized)
        
        return sanitized
    
    @staticmethod
    def sanitize_json(data: Any) -> Any:
        """Sanitize JSON data recursively."""
        if isinstance(data, str):
            return XSSPrevention.sanitize_html(data)
        elif isinstance(data, dict):
            return {k: XSSPrevention.sanitize_json(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [XSSPrevention.sanitize_json(item) for item in data]
        return data
```

### 4.3 File Upload Security
```python
# src/security/file_upload.py
import os
import hashlib
import magic
from typing import Optional

class FileUploadSecurity:
    """Secure file upload handling."""
    
    ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf"}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    UPLOAD_PATH = "/secure/uploads"
    
    @classmethod
    def validate_file(cls, file_data: bytes, filename: str) -> Optional[str]:
        """Validate uploaded file."""
        # Check file size
        if len(file_data) > cls.MAX_FILE_SIZE:
            raise ValueError("File too large")
        
        # Check extension
        ext = os.path.splitext(filename)[1].lower()
        if ext not in cls.ALLOWED_EXTENSIONS:
            raise ValueError(f"File type {ext} not allowed")
        
        # Check MIME type
        mime = magic.from_buffer(file_data, mime=True)
        if not cls.is_mime_allowed(mime):
            raise ValueError(f"MIME type {mime} not allowed")
        
        # Check for malicious content
        if cls.contains_malicious_content(file_data):
            raise ValueError("File contains malicious content")
        
        # Generate secure filename
        secure_name = cls.generate_secure_filename(filename)
        
        return secure_name
    
    @staticmethod
    def generate_secure_filename(original: str) -> str:
        """Generate secure filename."""
        ext = os.path.splitext(original)[1].lower()
        random_name = hashlib.sha256(os.urandom(32)).hexdigest()
        return f"{random_name}{ext}"
```

---

## 5. API SECURITY

### 5.1 Rate Limiting
```python
# src/security/rate_limiting.py
from fastapi import Request, HTTPException
from datetime import datetime, timedelta
import redis.asyncio as redis

class RateLimiter:
    """API rate limiting."""
    
    def __init__(self, redis_client):
        self.redis = redis_client
        self.limits = {
            "default": {"requests": 100, "window": 60},
            "auth": {"requests": 5, "window": 300},
            "payment": {"requests": 10, "window": 60},
            "report": {"requests": 5, "window": 60}
        }
    
    async def check_rate_limit(
        self,
        request: Request,
        endpoint_type: str = "default"
    ):
        """Check if request exceeds rate limit."""
        client_id = self.get_client_id(request)
        key = f"rate_limit:{endpoint_type}:{client_id}"
        
        limit_config = self.limits.get(endpoint_type, self.limits["default"])
        
        # Get current count
        current = await self.redis.get(key)
        
        if current is None:
            # First request
            await self.redis.setex(
                key,
                limit_config["window"],
                1
            )
        elif int(current) >= limit_config["requests"]:
            # Rate limit exceeded
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded",
                headers={"Retry-After": str(limit_config["window"])}
            )
        else:
            # Increment counter
            await self.redis.incr(key)
    
    def get_client_id(self, request: Request) -> str:
        """Get client identifier."""
        # Use API key if present
        if api_key := request.headers.get("X-API-Key"):
            return f"api:{api_key}"
        
        # Use user ID if authenticated
        if user := getattr(request.state, "user", None):
            return f"user:{user.id}"
        
        # Fall back to IP address
        return f"ip:{request.client.host}"
```

### 5.2 CORS Configuration
```python
# src/security/cors_config.py
from fastapi.middleware.cors import CORSMiddleware

CORS_CONFIG = {
    "allow_origins": [
        "https://pos.chefia.com.br",
        "https://kds.chefia.com.br",
        "https://admin.chefia.com.br"
    ],
    "allow_credentials": True,
    "allow_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": [
        "Content-Type",
        "Authorization",
        "X-Request-ID",
        "X-API-Key"
    ],
    "expose_headers": ["X-Request-ID"],
    "max_age": 3600
}

app.add_middleware(
    CORSMiddleware,
    **CORS_CONFIG
)
```

### 5.3 API Key Management
```python
# src/security/api_keys.py
import secrets
from datetime import datetime, timedelta
from typing import Optional

class APIKeyManager:
    """API key management."""
    
    def generate_api_key(
        self,
        client_id: str,
        expires_in: Optional[timedelta] = None
    ) -> dict:
        """Generate new API key."""
        key = f"sk_{secrets.token_urlsafe(32)}"
        
        api_key = {
            "key": key,
            "client_id": client_id,
            "created_at": datetime.utcnow(),
            "expires_at": datetime.utcnow() + expires_in if expires_in else None,
            "permissions": [],
            "rate_limit": "default",
            "active": True
        }
        
        # Store hashed version
        hashed_key = hashlib.sha256(key.encode()).hexdigest()
        await self.store_api_key(hashed_key, api_key)
        
        return api_key
    
    async def validate_api_key(self, key: str) -> Optional[dict]:
        """Validate API key."""
        hashed_key = hashlib.sha256(key.encode()).hexdigest()
        
        api_key = await self.get_api_key(hashed_key)
        
        if not api_key:
            return None
        
        if not api_key["active"]:
            return None
        
        if api_key["expires_at"] and api_key["expires_at"] < datetime.utcnow():
            return None
        
        # Update last used
        await self.update_last_used(hashed_key)
        
        return api_key
```

---

## 6. SECURITY MONITORING

### 6.1 Audit Logging
```python
# src/security/audit_log.py
from enum import Enum
from datetime import datetime
from typing import Optional, Dict, Any

class AuditEventType(Enum):
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    PERMISSION_DENIED = "permission_denied"
    DATA_ACCESS = "data_access"
    DATA_MODIFICATION = "data_modification"
    PAYMENT_PROCESSED = "payment_processed"
    CONFIGURATION_CHANGE = "configuration_change"
    SECURITY_ALERT = "security_alert"

class AuditLogger:
    """Security audit logging."""
    
    async def log_event(
        self,
        event_type: AuditEventType,
        user_id: Optional[str],
        details: Dict[str, Any],
        ip_address: str,
        user_agent: str
    ):
        """Log security event."""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type.value,
            "user_id": user_id,
            "ip_address": self.anonymize_ip(ip_address),
            "user_agent": user_agent,
            "details": self.sanitize_details(details),
            "session_id": details.get("session_id"),
            "risk_score": self.calculate_risk_score(event_type, details)
        }
        
        # Store in database
        await self.store_audit_event(event)
        
        # Alert on high-risk events
        if event["risk_score"] > 7:
            await self.send_security_alert(event)
    
    def calculate_risk_score(
        self,
        event_type: AuditEventType,
        details: Dict[str, Any]
    ) -> int:
        """Calculate risk score for event."""
        base_scores = {
            AuditEventType.LOGIN_FAILURE: 3,
            AuditEventType.PERMISSION_DENIED: 4,
            AuditEventType.CONFIGURATION_CHANGE: 7,
            AuditEventType.SECURITY_ALERT: 9
        }
        
        score = base_scores.get(event_type, 1)
        
        # Adjust based on context
        if details.get("repeated_failures", 0) > 5:
            score += 3
        
        if details.get("suspicious_pattern"):
            score += 2
        
        return min(score, 10)
```

### 6.2 Intrusion Detection
```python
# src/security/intrusion_detection.py
from collections import defaultdict
from datetime import datetime, timedelta

class IntrusionDetector:
    """Detect potential security threats."""
    
    def __init__(self):
        self.failed_logins = defaultdict(list)
        self.suspicious_patterns = []
        self.blocked_ips = set()
    
    async def analyze_request(self, request: Request) -> bool:
        """Analyze request for suspicious activity."""
        ip = request.client.host
        
        # Check if IP is blocked
        if ip in self.blocked_ips:
            return False
        
        # Check for SQL injection attempts
        if self.detect_sql_injection(request):
            await self.handle_threat("sql_injection", request)
            return False
        
        # Check for XSS attempts
        if self.detect_xss(request):
            await self.handle_threat("xss", request)
            return False
        
        # Check for path traversal
        if self.detect_path_traversal(request):
            await self.handle_threat("path_traversal", request)
            return False
        
        # Check for brute force
        if self.detect_brute_force(ip):
            await self.handle_threat("brute_force", request)
            return False
        
        return True
    
    def detect_sql_injection(self, request: Request) -> bool:
        """Detect SQL injection attempts."""
        patterns = [
            r"(\bUNION\b.*\bSELECT\b)",
            r"(\bDROP\b.*\bTABLE\b)",
            r"(\bINSERT\b.*\bINTO\b)",
            r"(\bDELETE\b.*\bFROM\b)",
            r"(--|\#|\/\*)",
            r"(\bOR\b.*=.*)",
            r"(\bAND\b.*=.*)"
        ]
        
        params = str(request.url.query) + str(request.path_params)
        
        for pattern in patterns:
            if re.search(pattern, params, re.IGNORECASE):
                return True
        
        return False
```

---

## 7. COMPLIANCE REQUIREMENTS

### 7.1 PCI-DSS Compliance
```yaml
pci_requirements:
  data_protection:
    - Never store CVV/CVC
    - Mask PAN (show only last 4 digits)
    - Encrypt cardholder data at rest
    - Use TLS 1.2+ for transmission
  
  access_control:
    - Unique user IDs
    - Strong authentication
    - Restrict access by role
    - Log all access to cardholder data
  
  monitoring:
    - Track all access to network resources
    - Regular security testing
    - Maintain audit trails for 1 year
    - Review logs daily
```

### 7.2 LGPD Compliance
```yaml
lgpd_requirements:
  data_subject_rights:
    - Right to access personal data
    - Right to correct data
    - Right to delete data
    - Right to data portability
  
  consent_management:
    - Explicit consent for data collection
    - Clear privacy policy
    - Consent withdrawal mechanism
    - Age verification for minors
  
  data_protection:
    - Privacy by design
    - Data minimization
    - Purpose limitation
    - Encryption of personal data
```

---

## 8. INCIDENT RESPONSE

### 8.1 Security Incident Procedure
```yaml
incident_response:
  detection:
    1. Automated monitoring alerts
    2. User reports
    3. System anomaly detection
  
  assessment:
    1. Classify severity (Low/Medium/High/Critical)
    2. Identify affected systems
    3. Determine data exposure
  
  containment:
    1. Isolate affected systems
    2. Block malicious IPs
    3. Disable compromised accounts
    4. Preserve evidence
  
  eradication:
    1. Remove malicious code
    2. Patch vulnerabilities
    3. Update security controls
  
  recovery:
    1. Restore from clean backups
    2. Monitor for recurrence
    3. Verify system integrity
  
  lessons_learned:
    1. Document incident
    2. Update security procedures
    3. Train staff on prevention
```

### 8.2 Data Breach Response
```python
# src/security/breach_response.py
class DataBreachHandler:
    """Handle data breach incidents."""
    
    async def handle_breach(self, breach_details: dict):
        """Coordinate breach response."""
        
        # 1. Immediate containment
        await self.contain_breach(breach_details)
        
        # 2. Assess impact
        impact = await self.assess_impact(breach_details)
        
        # 3. Notify authorities (within 72 hours for LGPD)
        if impact["personal_data_affected"]:
            await self.notify_authorities(impact)
        
        # 4. Notify affected users
        if impact["users_affected"]:
            await self.notify_users(impact["users_affected"])
        
        # 5. Document incident
        await self.document_incident(breach_details, impact)
        
        # 6. Implement remediation
        await self.remediate(breach_details)
```

---

## 9. SECURITY CHECKLIST

### Development Security Checklist
```yaml
development:
  code_review:
    - [ ] No hardcoded credentials
    - [ ] No sensitive data in logs
    - [ ] Input validation implemented
    - [ ] SQL queries parameterized
    - [ ] Error messages don't expose system details
  
  dependencies:
    - [ ] All dependencies up to date
    - [ ] No known vulnerabilities
    - [ ] License compliance verified
  
  testing:
    - [ ] Security unit tests written
    - [ ] Penetration testing performed
    - [ ] OWASP Top 10 verified
```

### Deployment Security Checklist
```yaml
deployment:
  infrastructure:
    - [ ] Firewall configured
    - [ ] Unnecessary ports closed
    - [ ] SSL/TLS certificates valid
    - [ ] Security headers configured
  
  application:
    - [ ] Debug mode disabled
    - [ ] Default credentials changed
    - [ ] Secrets in secure storage
    - [ ] Rate limiting enabled
  
  monitoring:
    - [ ] Security alerts configured
    - [ ] Audit logging enabled
    - [ ] Backup verification
    - [ ] Incident response plan tested
```

---

## 10. SECURITY TOOLS & TESTING

### Security Testing Commands
```bash
# Dependency vulnerability scan
pip-audit

# Static code analysis
bandit -r src/

# SQL injection testing
sqlmap -u "http://localhost:8001/api/v1/orders?id=1"

# XSS testing
python xsscrapy.py -u http://localhost:8001

# SSL/TLS testing
nmap --script ssl-enum-ciphers -p 443 localhost

# OWASP ZAP scan
zap-cli quick-scan --self-contained http://localhost:8001

# Load testing for DDoS resilience
locust -f locustfile.py --host=http://localhost:8001
```

---

*Document Version: 1.0.0*
*Last Updated: January 2025*
*Review Schedule: Quarterly*
*Classification: CONFIDENTIAL*