# gallery-image-api

This is my code for the API from the [Google Developers Group Denver](https://developers.google.com/groups/chapter/107789954104899034011/) event where I allowed users to create their own custom gallery.

You can use it to Build an api which serves image content to a VR scene built in Unity.

The Unity VR scene is pre-compiled as an Android app [here](https://play.google.com/store/apps/details?id=com.thebelin.myvrgallery&hl=en), and source code is also available on GitHub (link coming soon)

To build and start the api, first install node.js and then:

    git clone https://github.com/thebelin/gallery-image-api
    cd gallery-image-api
    npm i
    npm start

To change the way the gallery serves data, adjust the env.json file for your specific server.

To post a gallery, use POSTMan to POST all the images as the field "images" to the /upload route.
Here is a live example running on my own host, which was used in the software demo.

[![Run in Postman](https://run.pstmn.io/button.svg)](https://app.getpostman.com/run-collection/d331566ca734580443a0)
