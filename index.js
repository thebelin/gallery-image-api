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

// Image Limit
  image_limit = (process.env.IMAGE_LIMIT == undefined ? env.IMAGE_LIMIT : process.env.IMAGE_LIMIT),

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

// For resizing images
//  resizeImg = require('resize-img'),

// For reading the size of images
 // reader = require('image-size-reader'),

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
    this.id = randomLorem({length: 8, syllables: 2});

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

// Create a new gallery, return id
  makeGallery = function (req, res) {
    var gallery = new Gallery(),
      thisId = gallery.id;

    // Store the gallery in the metadata
    metadata[thisId] = gallery;

    // Remove the internal id attribute
    delete(metadata[thisId].id);

    // Save the metadata in the metadata.json file
    fs.writeFile(metadataStorage, JSON.stringify(metadata, null, 2));

    res.json({id: thisId});

    return(thisId);
  },

// Add an item to a gallery (up to the limit)
  addItem = function (req, res) {
    // The id of the gallery
    var thisId = req.params.id,
      form = new multiparty.Form({uploadDir: incomingPath});

    // If they haven't specified an id, then create one
    if (thisId == undefined) {
      thisId = makeGallery(req, res);
    }

    var gallery = metadata[thisId];
    
    console.log('addItem ->gallery: ', thisId, gallery);

    if (gallery && gallery.files instanceof Array && gallery.files.length < image_limit) {
      form.parse(req, function (err, fields, files) {
        // These are the file measurements
        var width = 0, height = 0,
        // Move the uploaded files into a subdirectory of the content folder
        // according to the galleryId
          newLocation = path.join(__dirname, 'content', thisId);

          // Create the new folder
          mkdirp(newLocation),

          // The file being processed
          file = files.images[0];
        
        console.log('files:', files);

        fs.rename(file.path, path.join(newLocation, file.originalFilename), function (err) {
          if (err) {
            console.log("Err: ", err);
          }
        });

        gallery.files.push(new Image({
          pictureName: file.originalFilename,
          artist: file.originalFilename,
          url: 'http://' + path.join(public_url, "content", thisId, file.originalFilename),
          width: width,
          height: height
        }));

        // Remove the internal id attribute
        delete(metadata[thisId].id);

        // Save the metadata in the metadata.json file
        fs.writeFile(metadataStorage, JSON.stringify(metadata, null, 2));
        console.log("addItem complete : ", metadata[thisId]);

        // res.json({id: thisId});
        res.end(JSON.stringify({id: thisId}));
      });
    } else {
      res.json(Object.assign({}, gallery, {error: 'gallery not found or already full'}));
    }
  },

// The File uploader middleware
  uploader = function (req, res) {
    console.log('incomingPath', incomingPath);
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
          fs.rename(file.path, path.join(newLocation, file.originalFilename), function (err) {
            if (err) {
              console.log("Err: ", err);
            }
          });

          // @todo get uploaded image dimensions
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

// Make the images which have been uploaded available
app.use('/content', express.static(content_folder));

// make the metadata available
app.use('/json/:metaid', metadataGet);

// make the interface available
app.use('/', express.static(path.join(__dirname, 'html')));

// Make the builder available
app.use('/makegallery', makeGallery);
app.use(['/additem/:id', '/additem'], addItem);

// Make the uploader available
app.use('/upload', uploader);

// Start the HTTP listener on http
console.log('starting http server on port ' + port_http);
http.createServer(app).listen(port_http);