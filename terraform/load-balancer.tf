# =============================================================================
# Global Load Balancer with Cloud Armor WAF
# =============================================================================
# Purpose: Secure, highly available entry point for RevClear application
# - HTTPS with SSL certificates
# - Cloud Armor WAF for DDoS protection and threat filtering
# - Global load balancing across regions
# - Health checks and auto-scaling
# =============================================================================

# Reserve global static IP address for load balancer
resource "google_compute_global_address" "lb_ip" {
  name    = "revclear-lb-ip-${var.environment}"
  project = var.project_id
}

# =============================================================================
# SSL Certificate (Managed by Google)
# =============================================================================

# Managed SSL certificate (auto-renewal)
resource "google_compute_managed_ssl_certificate" "lb_cert" {
  name    = "revclear-ssl-cert-${var.environment}"
  project = var.project_id

  managed {
    domains = var.domain_names # e.g., ["revclear.com", "www.revclear.com", "api.revclear.com"]
  }
}

# =============================================================================
# Backend Service (Cloud Run)
# =============================================================================

# Backend: Frontend application (Cloud Run)
resource "google_compute_backend_service" "frontend" {
  name                  = "revclear-frontend-backend-${var.environment}"
  project               = var.project_id
  protocol              = "HTTPS"
  port_name             = "http1"
  timeout_sec           = 30
  enable_cdn            = true # Enable Cloud CDN for static assets
  compression_mode      = "AUTOMATIC"
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group = google_compute_region_network_endpoint_group.frontend_neg.id
  }

  # Health check
  health_checks = [google_compute_health_check.frontend_health.id]

  # Cloud Armor security policy
  security_policy = google_compute_security_policy.cloud_armor.id

  # Logging
  log_config {
    enable      = true
    sample_rate = 1.0 # 100% sampling for HIPAA audit
  }

  # IAP (Identity-Aware Proxy) for additional security
  iap {
    oauth2_client_id     = var.iap_client_id     # Optional: Configure IAP
    oauth2_client_secret = var.iap_client_secret # Optional: Configure IAP
  }
}

# Backend: API service (Cloud Run)
resource "google_compute_backend_service" "api" {
  name                  = "revclear-api-backend-${var.environment}"
  project               = var.project_id
  protocol              = "HTTPS"
  port_name             = "http1"
  timeout_sec           = 60 # Longer timeout for API processing
  enable_cdn            = false
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group = google_compute_region_network_endpoint_group.api_neg.id
  }

  health_checks   = [google_compute_health_check.api_health.id]
  security_policy = google_compute_security_policy.cloud_armor.id

  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

# =============================================================================
# Network Endpoint Groups (NEG) for Cloud Run
# =============================================================================

# NEG: Frontend Cloud Run service
resource "google_compute_region_network_endpoint_group" "frontend_neg" {
  name                  = "revclear-frontend-neg-${var.environment}"
  project               = var.project_id
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_service.frontend.name
  }
}

# NEG: API Cloud Run service
resource "google_compute_region_network_endpoint_group" "api_neg" {
  name                  = "revclear-api-neg-${var.environment}"
  project               = var.project_id
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_service.api.name
  }
}

# =============================================================================
# Health Checks
# =============================================================================

# Health check: Frontend
resource "google_compute_health_check" "frontend_health" {
  name                = "revclear-frontend-health-${var.environment}"
  project             = var.project_id
  check_interval_sec  = 30
  timeout_sec         = 10
  healthy_threshold   = 2
  unhealthy_threshold = 3

  https_health_check {
    port         = 443
    request_path = "/health"
  }

  log_config {
    enable = true
  }
}

# Health check: API
resource "google_compute_health_check" "api_health" {
  name                = "revclear-api-health-${var.environment}"
  project             = var.project_id
  check_interval_sec  = 30
  timeout_sec         = 10
  healthy_threshold   = 2
  unhealthy_threshold = 3

  https_health_check {
    port         = 443
    request_path = "/api/health"
  }

  log_config {
    enable = true
  }
}

# =============================================================================
# URL Map (Routing Rules)
# =============================================================================

resource "google_compute_url_map" "lb_url_map" {
  name            = "revclear-lb-url-map-${var.environment}"
  project         = var.project_id
  default_service = google_compute_backend_service.frontend.id

  # Route /api/* to API backend
  host_rule {
    hosts        = var.domain_names
    path_matcher = "path-matcher"
  }

  path_matcher {
    name            = "path-matcher"
    default_service = google_compute_backend_service.frontend.id

    path_rule {
      paths   = ["/api/*"]
      service = google_compute_backend_service.api.id
    }

    path_rule {
      paths   = ["/"]
      service = google_compute_backend_service.frontend.id
    }
  }
}

# =============================================================================
# HTTPS Proxy
# =============================================================================

resource "google_compute_target_https_proxy" "lb_https_proxy" {
  name             = "revclear-https-proxy-${var.environment}"
  project          = var.project_id
  url_map          = google_compute_url_map.lb_url_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.lb_cert.id]

  # Force modern TLS
  ssl_policy = google_compute_ssl_policy.modern_tls.id
}

# SSL Policy: Modern TLS 1.3
resource "google_compute_ssl_policy" "modern_tls" {
  name            = "revclear-modern-tls-${var.environment}"
  project         = var.project_id
  profile         = "MODERN" # TLS 1.2+ with strong ciphers
  min_tls_version = "TLS_1_2"
}

# =============================================================================
# Global Forwarding Rule (Entry Point)
# =============================================================================

resource "google_compute_global_forwarding_rule" "https" {
  name                  = "revclear-https-forwarding-${var.environment}"
  project               = var.project_id
  ip_protocol           = "TCP"
  port_range            = "443"
  target                = google_compute_target_https_proxy.lb_https_proxy.id
  ip_address            = google_compute_global_address.lb_ip.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# HTTP to HTTPS redirect
resource "google_compute_url_map" "http_redirect" {
  name    = "revclear-http-redirect-${var.environment}"
  project = var.project_id

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "http_redirect_proxy" {
  name    = "revclear-http-redirect-proxy-${var.environment}"
  project = var.project_id
  url_map = google_compute_url_map.http_redirect.id
}

resource "google_compute_global_forwarding_rule" "http" {
  name                  = "revclear-http-forwarding-${var.environment}"
  project               = var.project_id
  ip_protocol           = "TCP"
  port_range            = "80"
  target                = google_compute_target_http_proxy.http_redirect_proxy.id
  ip_address            = google_compute_global_address.lb_ip.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# =============================================================================
# Cloud Armor WAF (Web Application Firewall)
# =============================================================================

resource "google_compute_security_policy" "cloud_armor" {
  name    = "revclear-cloud-armor-${var.environment}"
  project = var.project_id

  # Rule 1: Block known malicious IPs (Google Cloud Armor threat intelligence)
  rule {
    action   = "deny(403)"
    priority = 1000
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["9.9.9.0/24"] # Example: Replace with actual threat IPs
      }
    }
    description = "Block known malicious IPs"
  }

  # Rule 2: Rate limiting (DDoS protection)
  rule {
    action   = "rate_based_ban"
    priority = 2000
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = 100 # 100 requests
        interval_sec = 60  # per minute
      }
      ban_duration_sec = 600 # Ban for 10 minutes
    }
    description = "Rate limiting: 100 requests/minute per IP"
  }

  # Rule 3: SQL injection protection
  rule {
    action   = "deny(403)"
    priority = 3000
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sqli-stable')"
      }
    }
    description = "Block SQL injection attempts"
  }

  # Rule 4: XSS (Cross-Site Scripting) protection
  rule {
    action   = "deny(403)"
    priority = 4000
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('xss-stable')"
      }
    }
    description = "Block XSS attacks"
  }

  # Rule 5: Local File Inclusion (LFI) protection
  rule {
    action   = "deny(403)"
    priority = 5000
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('lfi-stable')"
      }
    }
    description = "Block local file inclusion attempts"
  }

  # Rule 6: Remote Code Execution (RCE) protection
  rule {
    action   = "deny(403)"
    priority = 6000
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('rce-stable')"
      }
    }
    description = "Block remote code execution attempts"
  }

  # Rule 7: Protocol attack protection
  rule {
    action   = "deny(403)"
    priority = 7000
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('protocolattack-stable')"
      }
    }
    description = "Block protocol attacks"
  }

  # Rule 8: Session fixation protection
  rule {
    action   = "deny(403)"
    priority = 8000
    match {
      expr {
        expression = "evaluatePreconfiguredExpr('sessionfixation-stable')"
      }
    }
    description = "Block session fixation attempts"
  }

  # Rule 9: Geographic restriction (optional - restrict to US only)
  rule {
    action   = "deny(403)"
    priority = 9000
    match {
      expr {
        expression = "origin.region_code != 'US'"
      }
    }
    description = "Block non-US traffic (HIPAA data residency)"
  }

  # Default rule: Allow all other traffic
  rule {
    action   = "allow"
    priority = 2147483647 # Lowest priority
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow rule"
  }

  # Advanced DDoS protection
  adaptive_protection_config {
    layer_7_ddos_defense_config {
      enable = true
    }
  }
}

# =============================================================================
# Variables
# =============================================================================

variable "domain_names" {
  description = "Domain names for SSL certificate and routing"
  type        = list(string)
  default     = ["revclear.example.com"] # Update with your actual domain
}

variable "iap_client_id" {
  description = "OAuth2 client ID for Identity-Aware Proxy (optional)"
  type        = string
  default     = ""
}

variable "iap_client_secret" {
  description = "OAuth2 client secret for Identity-Aware Proxy (optional)"
  type        = string
  sensitive   = true
  default     = ""
}

# =============================================================================
# Outputs
# =============================================================================

output "load_balancer_ip" {
  description = "Global load balancer IP address"
  value       = google_compute_global_address.lb_ip.address
}

output "load_balancer_url" {
  description = "Load balancer URL (update DNS to point here)"
  value       = "https://${google_compute_global_address.lb_ip.address}"
}

output "ssl_certificate_status" {
  description = "SSL certificate provisioning status"
  value       = google_compute_managed_ssl_certificate.lb_cert.managed[0].status
}

output "cloud_armor_policy" {
  description = "Cloud Armor security policy name"
  value       = google_compute_security_policy.cloud_armor.name
}
