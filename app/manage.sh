#!/bin/bash

# Tax Calculator Application Management Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function definitions
help() {
    echo "Tax Calculator Application Management Script"
    echo ""
    echo "Usage: ./manage.sh [COMMAND] [ENVIRONMENT]"
    echo ""
    echo "Commands:"
    echo "  start       Start the application"
    echo "  stop        Stop the application"
    echo "  restart     Restart the application"
    echo "  build       Build all services"
    echo "  logs        Show logs for all services"
    echo "  status      Show status of all services"
    echo "  clean       Clean up containers and volumes"
    echo "  test        Run health checks"
    echo ""
    echo "Environments:"
    echo "  dev         Development environment (default)"
    echo "  prod        Production environment"
    echo ""
    echo "Examples:"
    echo "  ./manage.sh start dev"
    echo "  ./manage.sh build"
    echo "  ./manage.sh logs"
}

start_app() {
    local env=${1:-dev}
    print_status "Starting Tax Calculator Application in $env environment..."
    
    if [ "$env" = "prod" ]; then
        docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
    else
        docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
    fi
    
    print_status "Application started! Frontend available at: http://localhost:3000"
    print_status "API Gateway available at: http://localhost:80"
}

stop_app() {
    print_status "Stopping Tax Calculator Application..."
    docker compose down
    print_status "Application stopped."
}

restart_app() {
    local env=${1:-dev}
    print_status "Restarting Tax Calculator Application..."
    stop_app
    start_app $env
}

build_app() {
    print_status "Building all services..."
    docker compose build --no-cache
    print_status "Build completed."
}

show_logs() {
    print_status "Showing application logs..."
    docker compose logs -f
}

show_status() {
    print_status "Application status:"
    docker compose ps
}

clean_app() {
    print_warning "This will remove all containers, networks, and volumes!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning up..."
        docker compose down -v --remove-orphans
        docker system prune -f
        print_status "Cleanup completed."
    else
        print_status "Cleanup cancelled."
    fi
}

test_health() {
    print_status "Running health checks..."
    
    services=(
        "http://localhost:8001/health:Invoice Service"
        "http://localhost:8002/health:Tax Calculation Service"
        "http://localhost:8003/health:Business Entity Service"
        "http://localhost:8004/health:ZK Proof Service"
        "http://localhost:8005/health:Validation Service"
        "http://localhost:3000:Frontend"
    )
    
    for service in "${services[@]}"; do
        IFS=':' read -r url name <<< "$service"
        if curl -s -f "$url" > /dev/null 2>&1; then
            print_status "$name: ✅ Healthy"
        else
            print_error "$name: ❌ Unhealthy"
        fi
    done
}

# Main script logic
case "${1:-help}" in
    start)
        start_app $2
        ;;
    stop)
        stop_app
        ;;
    restart)
        restart_app $2
        ;;
    build)
        build_app
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    clean)
        clean_app
        ;;
    test)
        test_health
        ;;
    help|*)
        help
        ;;
esac