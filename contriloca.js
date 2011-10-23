/*!
 * Contriloca
 * @version 0.0.1
 * Show the location of your github project contributors.
 *
 * Copyright 2011, Christian Vuerings - http://denbuzze.com
 */
/*globals dojo, $ */
// We use a self executing function to avoid global variables
var contriloca = (function () {

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
    project: "",
    url: {
      contributors: "https://api.github.com/repos/${project}/contributors",
      users: "https://api.github.com/users/${user}"
    },
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
            position: results[0].geometry.location,
            title: name
          });
          google.maps.event.addListener(marker, 'click', function() {
            config.infowindow.setContent(
              (contributor.avatar_url 
                ? '<img width="25px" height="25px" src="' 
                  + contributor.avatar_url + '" />' 
                : "" )
              + '<h2><a target="_blank" href="' + contributor.html_url 
                + '">' + name + '</a></h2>'
              + '<div><span>Contributions: </span>'
              + contributor.contributions + '</div>'
              + '<div><span>Location: </span>'
              + contributor.location + '</div>'
            );
            // Set the position & open the window
            config.infowindow.setPosition(marker.position);
            config.infowindow.open(config.map,marker);
          });
        }
        else if(status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
          // Workaround for the google rate limit
          setTimeout(function(){
            addtomap(login)
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
    dojo.xhrGet({
      url: config.url.contributors.replace("${project}", config.project),
      handleAs: "json"
    }).then(function(res){
      
      // Then we load extra information (e.g. location) for each user
      dojo.forEach(res, function(entry, i){

        // We want to be able to access each user through the
        // config.contributors variable. (e.g. config.contributors.denbuzze)
        config.contributors[entry.login] = entry;
        dojo.xhrGet({
            url: config.url.users.replace("${user}", entry.login),
            handleAs: "json"
        }).then(function(res){
          
          // If everything was successful we extend the information for each
          // user with the extra information (e.g. location)
          dojo.mixin(config.contributors[res.login], res);
          addtomap(res.login);
        });
      })
    });
  },

  /**
   * Load the googlemaps script
   * @param {Object} inputconfig The configuration object
   */
  load = function(inputconfig) {

    // Extend the global config with the passed in inputconfig
    dojo.mixin(config, inputconfig);

    // Create the google maps object
    config.map = new google.maps.Map(dojo.byId('map_canvas'),
        config.mapoptions);

    // Create the geocoder object
    config.geocoder = new google.maps.Geocoder();

    // Stop the code if no project was given
    // We need to do this after the google maps events
    if(!config.project) { return false; }

    // Get the contributors for a project.
    getcontributors();
  };

  /**
   * Make the following functions public under the contriloca
   * e.g. contriloca.load();
   */
  return {
    'config': config,
    'load': load
  };

})();

/**
 * All the DOM handlers for firing of the contriloca events 
 */
(function() {

  /**
   * Fire of the search for contributors 
   */
  var firesearch = function(){
    var val = dojo.byId('repository_name').value;
    
    // Check whether a value has been given, if so, fire of the contriloca
    // load event
    if(val){
      contriloca.load({
        project: val
      });
    }
  }

  // Connect the form with the onsubmit event
  dojo.connect(dojo.byId('navigation_form'), 'onsubmit', function(e){
    // disable the default submit function of this form
    e.preventDefault();

    firesearch();
  });

  // Add an onclick handler for all anchor elements in the navigation element
  dojo.query('#navigation a').connect('onclick', function(e){
    dojo.byId('repository_name').value = e.target.innerText;
    firesearch();
  });

})();

// The initial load for contriloca.
// It makes the google maps visible to the user
contriloca.load();

(function() {

  /**
   * Check whether the current browser has support for the HTML5 placeholder
   * attribute 
   */
  var hasPlaceholderSupport = function () {
    var input = document.createElement('input');
    return ('placeholder' in input);
  }

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

})();