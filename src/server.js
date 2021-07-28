import dnsd from "dnsd";

export default function (zone, options) {
  return new Promise((resolve, reject) => {
    const ttl = options.ttl || 10;
    const server = dnsd.createServer.defaults({ ttl })((req, res) => {
      try {
        const question = req.question[0];
        const name = question.name;
        const type = question.type;
        if (options.debug) {
          console.log(`< ${name} IN ${type}`);
        }
        if (type === "A" && zone[name]) {
          for (const data of Object.values(zone[name])) {
            if (options.debug) {
              console.log(`> ${name} ${ttl} IN A ${data}`);
            }
            res.answer.push({ name, type, data });
          }
        }
      } catch (e) {
        console.error(e);
      }
      res.end();
    });
    server.listen(options.port, options.host, () => resolve(server));
    server.on("error", reject);
  }).catch((e) => {
    if (options.debug) {
      console.error(e);
    }
    if (e.code === "EADDRINUSE") {
      throw new Error(
        `${e.code}. Address in use trying to listen on ${e.address}:${e.port}`
      );
    } else {
      throw new Error(`DNS service error on ${options.host}:${options.port}`);
    }
  });
}
