# docker-dnsd: DNS server for Docker network aliases

A local DNS server that replies with IP addresses for queries matching a Docker
container's network alias.

## Why

We want to be able to access a container's service from the Docker host by using
a domain name to resolve the IP address of the container.

The alternatives are to map the service's ports to `localhost`, or to use
`docker container inspect` to discover the IP address assigned to each container.

## Usage

There are three steps:

1. install the `docker-dnsd` package from npm
2. configure the DNS resolver
3. setup to run as a daemon on boot

### Installation

```sh
sudo npm install docker-dnsd -g
```

Options:

```
--port Int       port number for the server to listen on - default: 20053
--host String    host or IP address for the server to listen on - default: localhost
--socket String  path to local Docker socket - default: /var/run/docker.sock
-h, --help       displays help
```

`docker-dnsd` is a DNS server that responds to DNS queries. It can be queried using
local DNS tools like `dig`

```sh
dig @localhost -p 20053 container-network-alias
```

It's more useful when used as a nameserver for a specific domain and added to the
host system's resolver. It's helpful to choose a domain name that won't conflict with
anything else on the host system (`docker.test` is recommended).
Containers will need to have a network alias within the domain.

### DNS resolver

Here we tell the OS DNS resolver to use `docker-dnsd` to resolve names matching the
`docker.test` domain.

#### Linux - dnsmasq

Add dnsmasq configuration

```
# /etc/dnsmasq.d/docker.test
server=/docker.test/127.0.0.1#20053
```

#### Mac - resolver

Add resolver configuration

```
# /etc/resolver/docker.test
nameserver 127.0.0.1
port 20053
```

### Start on boot

_so you never have to think about this again_

#### cross platform - pm2

Install `pm2` and run the [startup script](https://pm2.keymetrics.io/docs/usage/startup/)

```sh
sudo npm install pm2 -g
pm2 startup
```

Start `docker-dnsd` and save so it will be restored on boot

```sh
pm2 start docker-dnsd
pm2 save
```

### Docker configuration

Provide a network alias using the `.docker.test` domain name for any containers
you want to lookup the IP address by domain name on the host machine.

```yaml
# my-project/docker-compose.yml
services:
  service-a:
    networks:
      default:
        aliases:
          - service-a.my-project.docker.test
```

:tada:

## How it works

`docker-dnsd` uses the Docker daemon API via the local socket to access the
container details and monitor for containers being added or removed. It then
runs a tiny DNS server to respond with the IP address for any name that matches
a container's network alias.
