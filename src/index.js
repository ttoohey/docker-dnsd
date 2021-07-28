import Optionator from "optionator";
import client from "./client";
import server from "./server";

const optionator = Optionator({
  prepend: "Usage: docker-dnsd [options]",
  append: `A local DNS server that replies with Docker container IP addresses for queries matching a container's network alias`,
  options: [
    {
      option: "port",
      default: process.env.PORT || "20053",
      type: "Int",
      description: "port number for the server to listen on",
    },
    {
      option: "host",
      default: process.env.HOST || "localhost",
      type: "String",
      description: "host or IP address for the server to listen on",
    },
    {
      option: "socket",
      default: "/var/run/docker.sock",
      type: "String",
      description: "path to local Docker socket",
    },
    {
      option: "debug",
      type: "Boolean",
      description: "enable debugging messages",
    },
    {
      option: "help",
      alias: "h",
      type: "Boolean",
      description: "displays help",
    },
  ],
});

const options = optionator.parseArgv(process.argv);
if (options.help) {
  console.log(optionator.generateHelp());
  process.exit();
}

(async () => {
  let dnsServer;
  try {
    const zone = {};
    dnsServer = await server(zone, options);
    await client(zone, options);
    console.log(`ready for DNS requests at ${options.host}:${options.port}`);
  } catch (e) {
    console.error(e.message);
    dnsServer?.close();
  }
})();
