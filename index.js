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
    this.images = images instanceof Array ? images : [];

    // the gallery has an identifying name, which also acts as security
    this.id = randomLorem({length: 8, syllables: 3});

    this.toString = function () {
      return JSON.stringify(self);
    }
  },

// The File uploader middleware
  uploader = function (req, res) {
    var form = new multiparty.Form();
    form.parse(req, function (err, fields, files) {
      // Create a new gallery which serves the files which were uploaded
      var gallery = new Gallery();

      // Create an array of image objects from the files array
      gallery.images = (function () {
        return files.images.map(function (file) {
          // Move the uploaded files into a subdirectory of the content folder
          // according to the galleryId
          var newLocation = path.join(__dirname, 'content', gallery.id);

          // Create the new folder
          mkdirp(newLocation);

          // move the file from the path attribute location
          // to the new location it will serve from
          fs.rename(file.path, path.join(newLocation, file.originalFilename), function (err) {
            if (err) {
              console.log("Err: ", err);
            }
          });

          // @todo get uploaded image dimensions
          // @todo resize uploaded image to conserve bandwidth
          return new Image({
            pictureName: file.originalFilename,
            artist: file.originalFilename,
            url: path.join("content", gallery.id, file.originalFilename),
            width: 0,
            height: 0
          });
        });
      }());

      // Save the gallery in the metadata
      metadata[gallery.id] = gallery;

      // Save the metadata in the metadata.json file
      fs.writeFile(metadataStorage, JSON.stringify(metadata, null, 2));

      res.json({fields: fields, files: files, gallery: gallery});
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

// Start the HTTP listener on http
console.log('starting http server on port ' + port_http);
http.createServer(app).listen(port_http);