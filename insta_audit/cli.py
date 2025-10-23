import argparse

def get_arguments():
    parser = argparse.ArgumentParser(description="Audit Instagram followers and following.")
    parser.add_argument("followers", type=str, help="Path to a followers.json file.")
    parser.add_argument("following", type=str, help="Path to a following.json file.")
    return parser.parse_args()

def main():
    args = get_arguments()
    print(f"Following file: {args.following}")
    print(f"Followers file: {args.followers}")
    return 0

if __name__ == "__main__":
    main()