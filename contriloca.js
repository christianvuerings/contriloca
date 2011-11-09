/*!
 * Contriloca
 * @version 0.0.2
 * Show the location of your github project contributors.
 *
 * Copyright 2011, Christian Vuerings - http://denbuzze.com
 */
/*globals dojo, $, google */
// We use a self executing function to avoid global variables
var contriloca = (function () {

  "use strict";

  var config = {
    contributors: {},
    geocoder: "",
    infowindow: new google.maps.InfoWindow(),
    map: "",
    mapoptions: {
      panControl: false,
      zoom: 2,
      center: new google.maps.LatLng(40, 10),
      mapTypeId: google.maps.MapTypeId.ROADMAP
    },
    markers: [],
    project: "",
    url: {
      contributors: "https://api.github.com/repos/${project}/contributors",
      users: "https://api.github.com/users/${user}"
    }
  },

  randomlocation = function(location){
    var min = 0.99999,
        max = 1.00001;
    return new google.maps.LatLng(
      location.lat() * (Math.random() * (max - min) + min),
      location.lng() * (Math.random() * (max - min) + min)
    );
  },

  /**
   * Add a user to the map
   * @param {String} login A github username which you want to show on the map
   */
  addtomap = function(login){
    var contributor = config.contributors[login];

    // We only go forward with the function if a login was given
    // and if the contributor has a location
    if(!contributor || !contributor.location){
      return false;
    }

    // We use the google geocoder to convert addresses into specific locations
    config.geocoder.geocode(
      {
        'address': contributor.location
      },
      function(results, status) {
        if (status === google.maps.GeocoderStatus.OK) {
          var name = contributor.name || login,
          marker = new google.maps.Marker({
            map: config.map,
            position: randomlocation(results[0].geometry.location),
            title: name
          });
          config.markers.push(marker);
          google.maps.event.addListener(marker, 'click', function() {
            config.infowindow.setContent(
              (contributor.avatar_url ?
                  '<img width="25px" height="25px" src="' +
                  contributor.avatar_url + '" />' :
                  "" ) +
                  '<h2><a target="_blank" href="' + contributor.html_url +
                  '">' + name + '</a></h2>' +
                  '<div><span>Contributions: </span>' +
                  contributor.contributions + '</div>' +
                  '<div><span>Location: </span>' +
                  contributor.location + '</div>'
            );
            // Set the position & open the window
            config.infowindow.setPosition(marker.position);
            config.infowindow.open(config.map,marker);
          });
          // Open the first infowindow
          if(config.markers.length === 1){
            google.maps.event.trigger(config.markers[0], 'click');
          }
        }
        else if(status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
          // Workaround for the google rate limit
          setTimeout(function(){
            addtomap(login);
          }, (Math.floor(Math.random() * (4000 - 501) + 500)));
        }
      }
    );

  },

  /**
   * Get contributors for the github project
   */
  getcontributors = function() {

    // We first get all the contributors for the given project
    dojo.io.script.get({
      url: config.url.contributors.replace("${project}", config.project),
      callbackParamName: "callback",
      load: function(res){

        // Then we load extra information (e.g. location) for each user
        dojo.forEach(res.data, function(entry, i){

          // We want to be able to access each user through the
          // config.contributors variable. (e.g. config.contributors.denbuzze)
          config.contributors[entry.login] = entry;
          dojo.io.script.get({
            url: config.url.users.replace("${user}", entry.login),
            callbackParamName: "callback",
            load: function(res){

              // If everything was successful we extend the information for
              // each user with the extra information (e.g. location)
              dojo.mixin(config.contributors[res.data.login], res.data);
              addtomap(res.data.login);
            }
          });
        });
      }
    });
  },

  /**
   * Load the googlemaps script
   * @param {Object} inputconfig The configuration object
   */
  load = function(inputconfig) {

    // Clear previous attributes of the config
    config.contributors = {};
    config.project = "";

    // Extend the global config with the passed in inputconfig
    dojo.mixin(config, inputconfig);

    // Create the google maps object if neccessary
    if( config.map ) {
      for(var i=0; i < config.markers.length; i++){
        config.markers[i].setMap(null);
      }
      config.markers = [];
    }
    else {
       config.map = new google.maps.Map(dojo.byId('map_canvas'),
            config.mapoptions);
    }

    // Create the geocoder object
    config.geocoder = config.geocoder || new google.maps.Geocoder();

    // Stop the code if no project was given
    // We need to do this after the google maps events
    if( !config.project ) {
      return false;
    } else {
      dojo.hash(dojo.objectToQuery({
        project: config.project
      }));
    }

    // Get the contributors for a project.
    getcontributors();
  },

  checkhash = function(hash) {
    var obj = dojo.queryToObject(hash);

    if(obj.project){
      load({
        project: obj.project
      });
      dojo.byId('repository_name').value = obj.project;
    }
  },

  /**
   * Initialiaze support for browser history
   */
  initHistory = function() {

    dojo.subscribe("/dojo/hashchange", window, function(hash){
      checkhash(hash);
    });

    checkhash(dojo.hash());

  },

  /**
   * Init function
   */
  init = function() {

    initHistory();

    // Load without arguments so we see a map already
    load();

  },

  /**
   * Fire of the search for contributors
   */
  fireformsearch = function(){
    var val = dojo.byId('repository_name').value;

    // Check whether a value has been given, if so, fire of the contriloca
    // load event
    if(val){
      load({
        project: val
      });
    }
  };

  // Connect the form with the onsubmit event
  dojo.connect(dojo.byId('navigation_form'), 'onsubmit', function(e){
    // disable the default submit function of this form
    e.preventDefault();

    fireformsearch();
  });

  // Add an onclick handler for all anchor elements in the navigation element
  dojo.query('#navigation_second a').connect('onclick', function(e){
    dojo.byId('repository_name').value = e.target.innerText;
    fireformsearch();
  });

  /**
   * Make the following functions public under the contriloca
   * e.g. contriloca.load();
   */
  return {
    'init': init
  };

})();

dojo.require("dojo.hash");
dojo.require("dojo.io.script");

// We need to add this because the dojo plug-ins need to be loaded
dojo.addOnLoad(function(){

  "use strict";

  // The initial load for contriloca.
  // It makes the google maps visible to the user
  contriloca.init();

});

(function(window, undefined) {

  "use strict";

  /**
   * Check whether the current browser has support for the HTML5 placeholder
   * attribute
   */
  var hasPlaceholderSupport = function() {
    var input = document.createElement('input');
    return ('placeholder' in input);
  };

  /**
   * We only execute this JavaScript if it is neccessary
   */
  if(!hasPlaceholderSupport()){
    dojo.query('input').onfocus(function(e){
      if(e.srcElement.placeholder === e.srcElement.value){
        e.srcElement.value = '';
      }
    }).onblur(function(e){
      if(e.srcElement.value === ''){
        e.srcElement.value = e.srcElement.placeholder;
      }
    });

  }

})(window);