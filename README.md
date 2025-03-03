# Layer Edge Auto Ping Node

![banner](./src/assets/image.png)
- website : https://dashboard.layeredge.io/

## Features

- **Auto Run Node**
- **Auto Create Accounts**
- **Auto Referrall**
- **Support Proxy usage**
- **Auto Claim Points every hour**

## Prerequisites

- Node.js installed on your machine


## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/rineil/ledge.git
    cd ledge
    ```

2. Install the required dependencies:
    ```sh
    pnpm i
    ```
3. paste proxy in `proxy.txt`:
-  format `http://username:password@ip:port` or `socks5://username:password@ip:port`
    ```sh
    nano proxy.txt
    ```
4. Auto Referral / create new wallets
    ```sh
    pnpm run autoref
    ```
4. Run the script:
    ```sh
    pnpm start
    ```


## All wallets information saved at `wallets.json`


## ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

This project is licensed under the [MIT License](LICENSE).