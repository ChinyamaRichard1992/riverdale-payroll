from functools import wraps
from time import time
from flask import request, g
import logging

logger = logging.getLogger(__name__)

def log_performance():
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Start timer
            start_time = time()
            
            # Execute route handler
            response = f(*args, **kwargs)
            
            # Calculate duration
            duration = time() - start_time
            
            # Log performance data
            log_data = {
                'path': request.path,
                'method': request.method,
                'duration': f"{duration:.3f}s",
                'status_code': getattr(response, 'status_code', None)
            }
            
            # Log different levels based on duration
            if duration < 0.1:
                logger.info(f"Request completed: {log_data}")
            elif duration < 0.5:
                logger.warning(f"Slow request: {log_data}")
            else:
                logger.error(f"Very slow request: {log_data}")
                
            return response
        return decorated_function
    return decorator
