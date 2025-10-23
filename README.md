# Insta Audit

A tool for auditing Instagram followers/following. For petty users who only follow accounts that follow back.

## Usage

1. Create/activate virtual environment:

    ```bash
    cd insta-audit
    python3 -m venv .venv
    source .venv/bin/activate
    ```

2. Install project:

    ```bash
    pip install -e .
    ```

3. Run command:

    ```bash
    insta-audit followers.json following.json
    ```