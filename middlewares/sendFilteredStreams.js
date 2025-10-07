const sendFilteredStreams = (req, res) => {
  const fallbackStreams = Array.isArray(req.streams) ? req.streams : [];
  const streams = Array.isArray(req.filteredStreams)
    ? req.filteredStreams
    : fallbackStreams;

  // Log what we're sending to Stremio
  if (streams.length > 0) {
    console.log('\n📤 SENDING TO STREMIO - First stream:');
    console.log(JSON.stringify(streams[0], null, 2));
    console.log('');
  }

  res.json({ streams });
};

module.exports = sendFilteredStreams;
