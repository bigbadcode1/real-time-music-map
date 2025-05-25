import socket
import os
from pathlib import Path
import argparse


def get_local_ip_from_hostname():

    try:
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        if local_ip == '127.0.1.1':
            s = None
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
                s.connect(("8.8.8.8", 80))  # Try Google's DNS
                local_ip = s.getsockname()[0]
                return local_ip
            except socket.error:
                return None
            finally:
                if s:
                    s.close()
        return local_ip
    except socket.error as e:
        print(f"Error getting local IP from hostname: {e}")
        return None
    

# print with ANSI code colors
def print_green(txt): print("\033[92m {}\033[00m" .format(txt))
def print_cyan(txt): print("\033[96m {}\033[00m" .format(txt))


# Define base paths for your components
BASE_DIR = Path(__file__).resolve().parent
BACKEND_DIR = BASE_DIR / "backend"
FRONTEND_DIR = BASE_DIR / "frontend"
DATABASE_DIR = BASE_DIR / "database"

# Define a dictionary for all possible environment variables
ALL_VARS_TEMPLATE = {
    "SPOTIFY_CLIENT_ID": "",
    "SPOTIFY_CLIENT_SECRET": "",
    "LOCAL_IP": "",
    "BACKEND_PORT": "8888",
    "DB_USER": "admin",
    "DB_PASS": "admin",
    "DB_HOST": "mapme-db",
    "DB_NAME":"music_map_db",
    "DB_PORT": "5432",
    "POSTGRES_HOST_AUTH_METHOD":"md5",
}

def generate_env_file(target_path: Path, variables: dict):

    with open(target_path, "w") as f:
        for key, value in variables.items():
            f.write(f"{key}={value}\n")
    print(f"Generated/Updated {target_path}")



def main():
    config = ALL_VARS_TEMPLATE.copy()
    
    print_cyan("\n--- Environment Variable Configuration ---")
    
    local_ip = get_local_ip_from_hostname()
    if local_ip:
        print(f"Detected local ip: {local_ip}")
        config["LOCAL_IP"] = local_ip

    print("Press Enter to accept the default value shown in [brackets].")
    print("------------------------------------------")


    for key, default_value in config.items():
        prompt_message = f"Enter value for {key}"

        if default_value:
            # Display default value in brackets
            prompt_message += f" [{default_value}]"
        else:
            # If no default, just indicate it's required or empty
            prompt_message += " (no default)"

        prompt_message += ": "

        user_input = input(prompt_message).strip()

        if user_input:
            # User provided a new value
            config[key] = user_input
        else:
            # User pressed Enter, use the default value
            config[key] = default_value


    print("\nCreating .env files...")

    # --- Configure Backend .env ---
    backend_vars = {
        "PORT": config['BACKEND_PORT'],
        "DB_USER": config["DB_USER"],
        "DB_PASS": config["DB_PASS"],
        "DB_HOST": config["DB_HOST"],
        "DB_NAME": config["DB_NAME"],
        "DB_PORT": config["DB_PORT"],
        "SPOTIFY_CLIENT_SECRET": config["SPOTIFY_CLIENT_SECRET"],
        "SPOTIFY_CLIENT_ID": config["SPOTIFY_CLIENT_ID"],
        "SPOTIFY_REDIRECT_URI": f"exp://{config["LOCAL_IP"]}:8081",
        # ... other backend specific variables
    }
    generate_env_file(BACKEND_DIR / ".env", backend_vars)

    frontend_vars = {
        "EXPO_PUBLIC_SPOTIFY_CLIENT_ID": config["SPOTIFY_CLIENT_ID"],
        "EXPO_PUBLIC_SPOTIFY_REDIRECT_URI": f"exp://{config["LOCAL_IP"]:8081}",
        "EXPO_PUBLIC_BACKEND_URL": f"http://{config["LOCAL_IP"]}:{config["BACKEND_PORT"]}",
    }
    
    generate_env_file(FRONTEND_DIR / ".env", frontend_vars)

    # --- Configure Database .env (if applicable for Docker Compose etc.) ---
    database_vars = {
        "POSTGRES_DB": config["DB_PORT"],
        "POSTGRES_USER": config["DB_USER"],
        "POSTGRES_PASSWORD": config["DB_PASS"],
        "POSTGRES_HOST_AUTH_METHOD": config["POSTGRES_HOST_AUTH_METHOD"],
    }

    generate_env_file(DATABASE_DIR / ".env", database_vars)

    print_green("\nConfiguration complete!")
    print("\nRemember to add Spotify Redirect URI to your spotify api dashboard (at https://developer.spotify.com/dashboard):")
    print(backend_vars["SPOTIFY_REDIRECT_URI"])

if __name__ == "__main__":
    main()