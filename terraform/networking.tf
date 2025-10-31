# Networking Infrastructure
# VPC, subnets, firewall rules for secure communication

resource "google_compute_network" "revclear_vpc" {
  name                    = "revclear-vpc-${var.environment}"
  auto_create_subnetworks = false
  
  depends_on = [google_project_service.required_apis]
}

resource "google_compute_subnetwork" "private_subnet" {
  name          = "revclear-private-${var.region}"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.revclear_vpc.id
  
  private_ip_google_access = true
  
  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata            = "INCLUDE_ALL_METADATA"
  }
}

# VPC Peering for Cloud SQL
resource "google_compute_global_address" "private_ip_address" {
  name          = "revclear-private-ip-${var.environment}"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.revclear_vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.revclear_vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
}

# Cloud NAT for outbound internet access
resource "google_compute_router" "router" {
  name    = "revclear-router-${var.environment}"
  region  = var.region
  network = google_compute_network.revclear_vpc.id
}

resource "google_compute_router_nat" "nat" {
  name                               = "revclear-nat-${var.environment}"
  router                             = google_compute_router.router.name
  region                             = google_compute_router.router.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
  
  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Firewall Rules
resource "google_compute_firewall" "allow_internal" {
  name    = "revclear-allow-internal-${var.environment}"
  network = google_compute_network.revclear_vpc.name
  
  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }
  
  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }
  
  allow {
    protocol = "icmp"
  }
  
  source_ranges = ["10.0.0.0/24"]
}

resource "google_compute_firewall" "allow_https" {
  name    = "revclear-allow-https-${var.environment}"
  network = google_compute_network.revclear_vpc.name
  
  allow {
    protocol = "tcp"
    ports    = ["443"]
  }
  
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["https-server"]
}

# Serverless VPC Connector for Cloud Run
resource "google_vpc_access_connector" "connector" {
  name          = "revclear-connector-${var.environment}"
  region        = var.region
  network       = google_compute_network.revclear_vpc.name
  ip_cidr_range = "10.8.0.0/28"
  
  depends_on = [google_project_service.required_apis]
}

# Outputs
output "vpc_name" {
  value = google_compute_network.revclear_vpc.name
}

output "vpc_connector_name" {
  value = google_vpc_access_connector.connector.name
}
