import docker from "harbor-master";

function update(zone, id, network) {
  const { Aliases, IPAddress } = network;
  let msg = [];
  for (const name of Aliases) {
    if (!zone[name]) {
      zone[name] = {};
    }
    if (IPAddress === "" && zone[name][id]) {
      msg.push(`- ${zone[name][id]} ${name}`);
      delete zone[name][id];
    }
    if (IPAddress) {
      zone[name][id] = IPAddress;
      msg.push(`+ ${zone[name][id]} ${name}`);
    }
    if (Object.keys(zone[name]).length === 0) {
      delete zone[name];
    }
  }
  return msg;
}

export default async function (zone, options) {
  try {
    const client = docker.Client({ socket: options.socket });
    const containers = await client.containers().list();
    for (const { Id } of containers) {
      const c = await client.containers().inspect(Id);
      for (const network of Object.values(c.NetworkSettings.Networks)) {
        const msgs = update(zone, c.Id, network);
        if (options.debug) {
          msgs.forEach((msg) => console.log(msg));
        }
      }
    }
    const handler = async (json) => {
      try {
        const { Type, Actor } = JSON.parse(json);
        if (Type !== "network") {
          return;
        }
        const { container, name } = Actor.Attributes;
        const c = await client.containers().inspect(container);
        const network = c.NetworkSettings.Networks[name];
        if (network) {
          const msgs = update(zone, c.Id, network);
          if (options.debug) {
            msgs.forEach((msg) => console.log(msg));
          }
        }
      } catch (e) {
        if (options.debug) {
          console.error(e);
        } else if (e.body) {
          console.error(e.body);
        } else if (e.message) {
          console.error(e.message);
        }
      }
    };
    const stream = await client.events();
    stream.on("data", handler);
  } catch (e) {
    e = e.error instanceof Error ? e.error : e;
    if (options.debug) {
      console.error(e);
    }
    if (e.code === "EACCES") {
      throw new Error(
        `${e.code}: Unable to connect to Docker socket '${e.address}'. Is the Docker daemon running?`
      );
    } else {
      throw e;
    }
  }
}
