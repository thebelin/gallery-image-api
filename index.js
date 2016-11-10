/**
 * A node.js file server for bulk image upload
 *
 * @author Belin Fieldson @thebelin
 * @copyright ISC 2016
 */
var path = require('path'),

// The default env values from a JSON file
  env = require(path.join(__dirname, 'env.json')),

// Static content folder to distribute from
  content_folder = (process.env.CONTENT_FOLDER == undefined)
    ? (path.join(__dirname, env.CONTENT_FOLDER))
    : process.env.CONTENT_FOLDER,

// Open http server
  port_http = (process.env.PORT_HTTP == undefined ? env.PORT_HTTP : process.env.PORT_HTTP),

// Public URL
  public_url = (process.env.PUBLIC_URL == undefined ? env.PUBLIC_URL : process.env.PUBLIC_URL),

// Express framework
  express = require('express'),

// Filesystem access
  fs = require('fs'),

// The app package
  app = express(),

// An http server
  http = require('http'),

// the body-parser for form processing
  bodyParser = require('body-parser'),

// multiparty
  multiparty = require('multiparty'),
  incomingPath = path.join(__dirname, 'incoming'),

// Nonsense generator
  randomLorem = require('random-lorem'),

// mkdirp allows us to make a folder
  mkdirp = require('mkdirp'),

// The metadata we are saving is held here
  metadataStorage = path.join(__dirname, 'data', 'uploads.json'),

// stored metadata is an object with galleries id as keys
  metadata = require(metadataStorage),

// the uploaded image constructor
  Image = function (options) {
    options = typeof options == 'object' ? options : {};
    Object.assign(this, options);
  }

// the uploaded gallery constructor
  Gallery = function (images) {
    var self = this;

    // store the images in an array
    // each item in the array should be a type Image
    this.files = images instanceof Array ? images : [];

    // the gallery has an identifying name, which also acts as security
    this.id = randomLorem({length: 8, syllables: 3});

    this.toString = function () {
      return JSON.stringify(self);
    }
  },

// The metadata fetch middleware
  metadataGet = function (req, res) {
    // The item to get
    var metaId = req.params.metaid;
    if (metadata[metaId]) {
      return res.json(metadata[metaId]);
    }
    return res.json({err:"Not Found"});
  },

// The File uploader middleware
  uploader = function (req, res) {
    var form = new multiparty.Form({uploadDir: incomingPath});
    form.parse(req, function (err, fields, files) {
      // Create a new gallery which serves the files which were uploaded
      var gallery = new Gallery(),

      // retain the gallery id
        thisId = gallery.id;

      // Create an array of image objects from the files array
      gallery.files = (function () {
        return files.images.map(function (file) {
          // These are the file measurements
          var width = 0, height = 0,
          // Move the uploaded files into a subdirectory of the content folder
          // according to the galleryId
            newLocation = path.join(__dirname, 'content', gallery.id);

          // Create the new folder
          mkdirp(newLocation);

          // move the file from the path attribute location
          // to the new location it will serve from
          // @todo and resize it in the process
          // @todo get uploaded image dimensions
          fs.rename(file.path, path.join(newLocation, file.originalFilename), function (err) {
            if (err) {
              console.log("Err: ", err);
            }
          });

          return new Image({
            pictureName: file.originalFilename,
            artist: file.originalFilename,
            url: 'http://' + path.join(public_url, "content", gallery.id, file.originalFilename),
            width: width,
            height: height
          });
        });
      }());

      // Save the gallery in the metadata
      metadata[thisId] = gallery;

      // Remove the internal id attribute
      delete(metadata[thisId].id);

      // Save the metadata in the metadata.json file
      fs.writeFile(metadataStorage, JSON.stringify(metadata, null, 2));

      res.json({id: thisId});
    });
  };
// End Variable declaration

// Make data available from forms
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Make the uploader available
app.use('/upload', uploader);

// @todo compress content
// Make the images which have been uploaded available
app.use('/content', express.static(content_folder));

// make the metadata available
app.use('/json/:metaid', metadataGet);

// Start the HTTP listener on http
console.log('starting http server on port ' + port_http);
http.createServer(app).listen(port_http);