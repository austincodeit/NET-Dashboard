//v1.2
//color status in filter menu
//update github
//should not run filter function if the filter has not changed....need to compare to existing filterList or build 'change' into the listern rather than 'click'
//marker popup should be a variable or function to call since it's duplicated.
//get some cool marker icons
//filter for primary violation
//change color for active filter
//streetview
//spiderify
//clusters
//heatmap
//splash screen?

//globals
var map, data, data2, markers, currentFilter;

var cvList = [];

var filterList = {
	"case_type":"all",
	"status":"all",
	"hasCV":"all",
	"primary_reported_violation": "all"
};

//constants
var serviceUrl_cases = "https://data.austintexas.gov/resource/37zz-93tg.json";
var serviceUrl_deficiencies = "https://data.austintexas.gov/resource/p4pj-6q8i.json";

var activeMarker = L.AwesomeMarkers.icon({
    icon: '',
    markerColor: 'red'
  });

var closedMarker = L.AwesomeMarkers.icon({
    icon: '',
    markerColor: 'green'
  });
  
var paClosed = L.AwesomeMarkers.icon({
    icon: 'glyphicon-trash',
    markerColor: 'green'
  });

var paActive = L.AwesomeMarkers.icon({
    icon: 'glyphicon-trash',
    markerColor: 'red'
  });

var paPending = L.AwesomeMarkers.icon({
	icon: 'glyphicon-trash',
	markerColor: 'purple'
});

  
var structureClosed = L.AwesomeMarkers.icon({
    icon: 'glyphicon-home',
    markerColor: 'green'
  });

var structureActive = L.AwesomeMarkers.icon({
    icon: 'glyphicon-home',
    markerColor: 'red'
  });

  var structurePending = L.AwesomeMarkers.icon({
    icon: 'glyphicon-home',
    markerColor: 'purple'
  });
  
var wwpClosed = L.AwesomeMarkers.icon({
    icon: 'glyphicon-wrench',
    markerColor: 'green'
  });

var wwpActive = L.AwesomeMarkers.icon({
    icon: 'glyphicon-wrench',
    markerColor: 'red'
});

var wwpPending = L.AwesomeMarkers.icon({
    icon: 'glyphicon-wrench',
    markerColor: 'purple'
});


var luClosed = L.AwesomeMarkers.icon({
    icon: 'glyphicon-flag',
    markerColor: 'green'
  });

var luActive = L.AwesomeMarkers.icon({
    icon: 'glyphicon-flag',
    markerColor: 'red'
});

var luPending = L.AwesomeMarkers.icon({
    icon: 'glyphicon-flag',
    markerColor: 'purple'
});


var iconDict = {
"Property Abatement": {"Active": paActive,"Closed":paClosed, "Pending":paPending},
"Work Without Permit": {"Active": wwpActive,"Closed":wwpClosed, "Pending":wwpPending},
"Structure Condition Violation(s)": {"Active": structureActive ,"Closed":structureClosed, "Pending":structurePending},
"Land Use Violation(s)": {"Active": luActive,"Closed":luClosed, "Pending":luPending}
}

//do stuff
getCases();

function getCases(){
	// get data
	$.ajax({
	'async': false,
	'global': false,
	'url': serviceUrl_cases,
	'dataType': "json",
	'success': function (d) {	
		data = d;
		makeMap();
		getEvents();
		}
	}); //end get data
}

function getEvents(){
	// get data
	$.ajax({
	'async': false,
	'global': false,
	'url': serviceUrl_deficiencies,
	'dataType': "json",
	'success': function (d) {
		data2 = d;
		identifyCVs();
		}
	}); //end get data
}



function makeMap(){
	
	L.Icon.Default.imagePath = "./images"; //leaflet didn't like the network path it was creating during testing, see (https://github.com/Leaflet/Leaflet/issues/766)
	
	var OSMBase = new L.TileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
			attribution: '<a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> | <a href="https://www.austintexas.gov/department/code" target=_blank>City of Austin Code Department</a>'
		});
	
	map = new L.Map("map", {center: [30.358332, -97.688295], zoom: 14, minZoom: 12, maxZoom: 18, layers: [OSMBase]})
	
	populate();
}

function populate(){

	var currentData = data;
	if
	(map.hasLayer(markers)) {//remove existing marker layer; used when filter is reset
		map.removeLayer(markers); 
	}
	
	markers = new L.layerGroup(); //create new layer
	
	for (var i = 0; i < currentData.length; i++) { 
		var lat = currentData[i].latitude;
		var lon = currentData[i].longitude;
		if (lat){
			var status = currentData[i].status;
			var prv = currentData[i].primary_reported_violation;
			var icon = iconDict[prv][status];
			var marker = L.marker([lat,lon], {icon: icon}).bindPopup(
				currentData[i].address + "<br>" + "<b>Primary Violation: </b>" + currentData[i].primary_reported_violation + "<br>" + "<b>Property Type: </b>" + currentData[i].case_type + "<br>" + "<b>Status: </b>" + currentData[i].status + "</br></br><img src='https://maps.googleapis.com/maps/api/streetview?size=200x200&location=" + lat + "," + lon + "'/>").addTo(markers);
		}
	}
	markers.addTo(map);
}

function superFilter(filter, value){
	//refresh marker layer
	map.removeLayer(markers); 
	markers = new L.layerGroup();
	
	currentData = [];
	var continueCheck = true;
	var count = 0; //debug
	
	for (var i = 0; i < data.length; i++){ //for every case
		var continueCheck = true;
		(function(){
			for (var q in filterList) {   // for every filter type
				if (continueCheck == true) {
					if (filterList[q] !="all"){ //if the filter list value is not 'all', i.e., there is an active filter
						if (data[i][q] != filterList[q]){ //if value in the data does not match the current filter value
							continueCheck = false;
							return; //if case does not meet one filter criteria, stop checking other filter criteria
						}
					}
				}
			}
			if (continueCheck == true) {
				currentData.push(data[i]); //push it to the current data
			}
		})();
	}

	for (var i = 0; i < currentData.length; i++) { 
		var lat = currentData[i].latitude;
		var lon = currentData[i].longitude;
		if (lat){
			var status = currentData[i].status;
			var prv = currentData[i].primary_reported_violation;
			var icon = iconDict[prv][status];
			var marker = L.marker([lat,lon], {icon: icon, maxWidth: 500}).bindPopup(
				currentData[i].address + "<br>" + "<b>Primary Violation: </b>" + currentData[i].primary_reported_violation + "<br>" + "<b>Property Type: </b>" + currentData[i].case_type + "<br>" + "<b>Status: </b>" + currentData[i].status + "</br></br><img src='https://maps.googleapis.com/maps/api/streetview?size=200x200&location=" + lat + "," + lon + "'/>"
				).addTo(markers);
		}
	}
	markers.addTo(map);
}

//listeners...you could reduce these by adding a 'filter' class to the dom and having one listener for all of the filter class and the id being the filter type
$( ".case_type" ).children().click(function() {
	var filterValue = $(this).attr("name");
	filterList["case_type"] = filterValue;
	superFilter();
});

$( ".status" ).children().click(function() {
	var filterValue = $(this).attr("name");
	filterList["status"] = filterValue;
	superFilter();
});

$( ".hasCV" ).children().click(function() {
	var filterValue = $(this).attr("name");
	filterList["hasCV"] = filterValue;
	superFilter();
});

$( ".primary_reported_violation" ).children().click(function() {
	var filterValue = $(this).attr("name");
	filterList["primary_reported_violation"] = filterValue;
	superFilter();
});

$( ".reset" ).click(function() { //on reset button click
	populate(); //redraw original map
	for (var i in filterList){ //reset filters by populating each with "all"
		filterList[i] = "all";
		var selText = $('.' + i).children().first().text() //get first name on drop-down list
		$('.' + i).closest('div').find('button[data-toggle="dropdown"]').html(selText + ' <span class="caret"></span>'); //and propogate it
	}
});

function identifyCVs (){
	//create list of all CC folder RSNs with a CV by comparing to the deficiencies data (data2)
	for (var i = 0; i < data2.length; i++){
		var folderRsn = data2[i].folderrsn;
		if (cvList.indexOf(folderRsn) < 0 ) {
			cvList.push(folderRsn);
		}
	}
	//add an attribute to cc cases (data1) indicating if the case has a CV (true) or not (false)
	for (var q = 0; q < data.length; q++){ //for every case
		if (cvList.indexOf(data[q].folderrsn) > -1 ) { //if the case folder rsn is on the cv list
			data[q]["hasCV"] = "true";			//it has a cv
		} else { 
			data[q]["hasCV"] = "false";  //ugh, "boolean" strings to match filter list values...i tried to fix this in the listener function, but gave up
		}
	}
}

//change drop-downs to selects
//see here: http://stackoverflow.com/questions/18150954/how-can-i-render-a-list-select-box-dropdown-with-bootstrap
$(".dropdown-menu li a").click(function(){
    var selText = $(this).text();
    $(this).closest('div').find('button[data-toggle="dropdown"]').html(selText + ' <span class="caret"></span>');
});
