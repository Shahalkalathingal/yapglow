const NodeMediaServer = require('node-media-server');
const config = {
    logType:3,
  rtmp: {
    port: 1935,
    chunk_size: 999999999,
    gop_cache: true,
    ping: 30,
    ping_timeout: 60
  },
  http: {
    port: 8000,
    allow_origin: '*',
    mediaroot:'./server/media'
  }
};

var nms = new NodeMediaServer(config)

nms.on('prePublish', (id, StreamPath, args) => {
  // eslint-disable-next-line no-console
  console.log(
    'Starting..................................................................................................................................',
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  );
  let session = nms.getSession(id);
  console.log(session);
  
});

nms.on('donePublish', (id, StreamPath, args) => {
  // eslint-disable-next-line no-console
  console.log(
    'Stopping...........................................................................................',
    `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`
  );
})

nms.on('postPlay', (id, StreamPath, args) => {
  console.log('[NodeEvent on postPlay..................................................................................]', `id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
});

nms.run();