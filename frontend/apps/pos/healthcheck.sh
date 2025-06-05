#!/bin/sh
# Health check script for POS Modern Frontend

# Check if nginx is running
if ! pgrep nginx > /dev/null; then
    echo "ERROR: nginx is not running"
    exit 1
fi

# Check if the application is responding
if ! curl -f http://localhost/health > /dev/null 2>&1; then
    echo "ERROR: Application health check failed"
    exit 1
fi

# Check if main application files exist
if [ ! -f "/usr/share/nginx/html/index.html" ]; then
    echo "ERROR: Main application file missing"
    exit 1
fi

echo "OK: Application is healthy"
exit 0

