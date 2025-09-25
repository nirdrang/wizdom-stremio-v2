const sendFilteredStreams = (req, res) => {
  const fallbackStreams = Array.isArray(req.streams) ? req.streams : [];
  const streams = Array.isArray(req.filteredStreams)
    ? req.filteredStreams
    : fallbackStreams;

  res.json({ streams });
};

module.exports = sendFilteredStreams;
