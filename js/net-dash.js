//new for v1.2.4//
//fix labels on time chart stack
//add data refresh timestamp

browserAlert();

//globals
var data1, data2, pie, pie2, arc, pctClosed;
var dataPicker = {
	"CCs" : {},
	"Defs" : {},
	"CVs" : {}
};

//constants
var margin = {
	top : 10,
	right : 10,
	bottom : 80,
	left : 55
};

var width = 325 - margin.left - margin.right,
height = 325 - margin.top - margin.bottom;

var statusList = ["Active", "Closed", "Pending"]; //this is also the order in which bars are drawn and updated..any additional status must be hardcoded here and added in the groupdata function
var typeList = ["Multifamily", "Commercial", "Neighborhood"]; //capitalized because these types are capitalized in raw data
var scaleDict = {
	"chart_1" : "",
	"chart_2" : "",
	"chart_4" : ""
};
var serviceUrl_cases = "https://data.austintexas.gov/resource/37zz-93tg.json";
var serviceUrl_deficiencies = "https://data.austintexas.gov/resource/p4pj-6q8i.json";
var metadataUrl_cases = "https://data.austintexas.gov/api/views/37zz-93tg/rows.json"

//var serviceUrl_cases = "./data/cases.json"; //for offline testing
//var serviceUrl_deficiencies = "./data/defs.json";
var formatPct = d3.format("%");
var formatDate = d3.time.format("%x");
var formatMonth = d3.time.format("%b %Y");
var formatDateTime = d3.time.format("%e %b %Y %H:%M%p");
var dataType = "all";

//x label truncator (see: http://stackoverflow.com/questions/1199352/smart-way-to-shorten-long-strings-with-javascript)
String.prototype.trunc =
function (n, useWordBoundary) {
	var toLong = this.length > n,
	s_ = toLong ? this.substr(0, n - 1) : this;
	s_ = useWordBoundary && toLong ? s_.substr(0, s_.lastIndexOf(' ')) : s_;
	return toLong ? s_ + '...' : s_;
};

//do stuff

//
getCases();

//listeners
$(".case_type").children().click(function () {
	var dataType = $(this).attr("name");
	updateBarChart("chart_1", dataPicker.CCs.violations[dataType], 750, scaleDict.chart_1); //HARDCODING :(
	updateBarChart("chart_2", dataPicker.Defs.violations[dataType], 750, scaleDict.chart_2);
	updateBarChart("chart_4", dataPicker.Time[dataType], 750, scaleDict.chart_4);
	updatePieChart(dataType, dataPicker.CCs.statuses, 750);
	updateInfoStat("info1", data1, dataType);
	updateInfoStat("info2", data1, dataType);
	updateTable(dataType);
});

$(".reset").click(function () { //on reset button click

	var selText = $('.case_type').children().first().text() //get first name on drop-down list
		$('.case_type').closest('div').find('button[data-toggle="dropdown"]').html(selText + ' <span class="caret"></span>'); // and propogate it

	var dataType = "all";
	updateBarChart("chart_1", dataPicker.CCs.violations[dataType], 750, scaleDict.chart_1); //HARDCODING :(
	updateBarChart("chart_2", dataPicker.Defs.violations[dataType], 750, scaleDict.chart_2);
	updateBarChart("chart_4", dataPicker.Time[dataType], 750, scaleDict.chart_4);
	updatePieChart(dataType, dataPicker.CCs.statuses, 750);
	updateInfoStat("info1", data1, dataType);
	updateInfoStat("info2", data1, dataType);
	updateTable(dataType);
});

//tooltips
var div = d3.select("body").append("div").attr("class", "tooltip").style("opacity", 0);

//pie tooltip
d3.selectAll(".pie").selectAll("path").on("mouseover", function (d) {
	var total = 0;
	var value = d.value;

	d3.selectAll(".pie").selectAll("path").each(function (d) {
		total += d.value;
	});

	div.transition()
	.duration(200)
	.style("opacity", .9);
	div.html(d.value + " " + d.data.status + " (" + formatPct(value / total) + ")")
	.style("left", (d3.event.pageX) + "px").style("top", (d3.event.pageY - 28) + "px");
})
.on("mouseout", function (d) {
	div.transition()
	.duration(500)
	.style("opacity", 0);
});

//bar tooltip
d3.selectAll(".stacked-bar").selectAll("rect").on("mouseover", function (d) {
	var thisClass = d3.select(this).attr("class")
		if (thisClass.indexOf("time") < 0) { //if this is not a time rect

			//calculate tooltip values
			////select parent node to get to div. if divid = chart_4 (or whatever the time chart is), then find the raw data value from masterstack
			var value = d.y;
			var status = d.status;
			var xLabel = d.x;
			var issue = d3.select(this).attr("issue");
			var total = 0;
			d3.selectAll("." + issue) //select all bars with same issue (CCs or Defs)...
			.filter(function (d) { //and filter by the type of violation (e.g., property abatement..or the week date in the case of the time chart)
				return d.x == xLabel;
			})
			.each(function (d) {
				total = total + d.y; //add up the total  of each matching bar (e.g. active, closed, etc).
			});

			div.transition().duration(200).style("opacity", .8);

			div.html(xLabel + "<br>" + value + " " + status + " (" + formatPct(value / total) + ")")
			.style("left", (d3.event.pageX + 10) + "px")
			.style("top", (d3.event.pageY - 35) + "px");

		} else { //if this is a time rect
			var status = d.status;
			var pct = formatPct(d.y);
			var xLabel = d.x;
			var value = masterDict[dataType][status][xLabel]; //reference masterDict to get the raw case value (because the d value bound to this element is a percentage of the total

			div.transition().duration(200).style("opacity", .8);

			div.html(value + " " + status + " (" + pct + ")" + "<br>" + xLabel)
			.style("left", (d3.event.pageX + 10) + "px")
			.style("top", (d3.event.pageY - 35) + "px");
		}
})
.on("mouseout", function (d) {
	div.transition()
	.duration(500)
	.style("opacity", 0);
});

function getCases() {
	// get data
	$.ajax({
		'async' : false,
		'global' : false,
		'url' : serviceUrl_cases,
		'dataType' : "json",
		'success' : function (d) {
			data1 = d;
			getEvents();
			getMetaData();
		}
	}); //end get data
}

function getEvents() {
	// get data
	$.ajax({
		'async' : false,
		'global' : false,
		'url' : serviceUrl_deficiencies,
		'dataType' : "json",
		'success' : function (d) {
			data2 = d;
			groupDataObjects();
		}
	}); //end get data
}

function getMetaData() {
	// get data
	$.ajax({
		'async' : false,
		'global' : false,
		'url' : metadataUrl_cases,
		'dataType' : "json",
		'success' : function (d) {
			var metadata = d;
			postUpdateDate(metadata);
		}
	}); //end get data
}

function postUpdateDate(data){
	var update_date = new Date(data.meta.view.rowsUpdatedAt * 1000);
	var update_date = formatDateTime(update_date);
	$('#update_date').text("Data updated " + update_date);
}

function groupDataObjects() { // see http://learnjsdata.com/group_data.html
	//for a stack of active/closed, you need an array length three: first object is arrays for active, second is arrays for closed, third pending. arrays must be SAME LENGTH!
	///////CC Violation Types////////
	dataPicker.CCs["violations"] = {};
	//this is the all CC violation type...
	var primaryViolationStatusCount = d3.nest()
		.key(function (d) {
			return d.status;
		}) //status is highest level obj
		.key(function (d) {
			return d.primary_reported_violation;
		}) //within status is each violation type
		.rollup(function (v) {
			return v.length;
		}) //rolling up the number of records for each violation type/status
		.map(data1); //note that .map() gives you key:value compared to .entries() which gives you key: [the key], value: [the value]

	//..and this is CC violation type propety type
	var primaryViolationStatusCountProperty = d3.nest()
		.key(function (d) {
			return d.case_type;
		}) //property is highest level obj
		.key(function (d) {
			return d.status;
		}) //then status
		.key(function (d) {
			return d.primary_reported_violation;
		}) //within status is each violation type
		.rollup(function (v) {
			return v.length;
		}) //rolling up the number of records for each violation type/status
		.map(data1);

	//send 'all' cc violations status to datapicker
	makeObjectsEqual(primaryViolationStatusCount, 1); // "1" flag means a keylist will be generate from this go-through <<<<<< COULD THIS BREAK IF IT DOES NOT PROCESS BEFORE NEXT BLOCK OF CODE??
	dataPicker.CCs["violations"]["all"] = formatForD3Stack(primaryViolationStatusCount);

	//send property type cc violations to datapicker
	for (var i = 0; i < typeList.length; i++) {
		var temp = primaryViolationStatusCountProperty[typeList[i]];
		makeObjectsEqual(temp);
		dataPicker.CCs["violations"][typeList[i]] = formatForD3Stack(temp);
	}

	/////categorydesc Types/////
	dataPicker.Defs["violations"] = {};
	//This is the all categorydesc type object....
	deficiencyStatusCount = d3.nest()
		.key(function (d) {
			return d.status;
		}) //status is highest level obj
		.key(function (d) {
			return d.categorydesc;
		}) //within status is each violation type
		.rollup(function (v) {
			return v.length;
		}) //rolling up the number of records for each violation type/status
		.map(data2); //note that .map gives you key:value compared to .entries which gives you key: [the key], value: [the value]

	//And this is categorydesc types by property type
	deficiencyStatusCountProperty = d3.nest()
		.key(function (d) {
			return d.case_type;
		}) //status is highest level obj
		.key(function (d) {
			return d.status;
		}) //status is highest level obj
		.key(function (d) {
			return d.categorydesc;
		}) //within status is each violation type
		.rollup(function (v) {
			return v.length;
		}) //rolling up the number of records for each violation type/status
		.map(data2); //note that .map gives you key:value compared to .entries which gives you key: [the key], value: [the value]

	makeObjectsEqual(deficiencyStatusCount, 1); //make categorydesc object equal and generate new key list (hence the '1' flag)
	dataPicker.Defs["violations"]["all"] = formatForD3Stack(deficiencyStatusCount);

	for (var i = 0; i < typeList.length; i++) {
		temp = deficiencyStatusCountProperty[typeList[i]];
		makeObjectsEqual(temp);
		dataPicker.Defs["violations"][typeList[i]] = formatForD3Stack(temp);
	}

	createStackChart(dataPicker.CCs.violations.all, "chart_1", "CCs");
	createStackChart(dataPicker.Defs.violations.all, "chart_2", "Defs");
	prepareTimeStackChart(data1);

	/////Overall Status Count (for pie chart)/////
	//This is the all status type object....
	var statusCountCC = d3.nest()
		.key(function (d) {
			return d.status;
		})
		.rollup(function (v) {
			return v.length;
		})
		.map(data1);

	//status by property type
	statusCountCCProperty = d3.nest()
		.key(function (d) {
			return d.case_type;
		})
		.key(function (d) {
			return d.status;
		})
		.rollup(function (v) {
			return v.length;
		})
		.map(data1);

	//for an updateable pie chart, your object is an array of two objects, one for active [0] and one for closed [0], with each key in the object being all, commericla, multifamily, or neighborhood.
	dataPicker.CCs["statuses"] = [];
	for (var i = 0; i < statusList.length; i++) {
		if (!statusCountCC[statusList[i]]) {
			statusCountCC[statusList[i]] = 0;
		}
		dataPicker.CCs["statuses"].push({
			"status" : statusList[i],
			"all" : statusCountCC[statusList[i]]
		})
		dataPicker.CCs["statuses"][i]["fake"] = 1; //for intial chart transition (creates a pie of equal parts
	}

	//need to make objects equal mannually here, because your funciton don't work with the pie chart objects
	for (var q = 0; q < statusList.length; q++) { //for every status
		for (var i = 0; i < typeList.length; i++) { //for every property types
			if (statusCountCCProperty[typeList[i]][statusList[q]] > 0) { //if a value exists for that status
				dataPicker.CCs["statuses"][q][typeList[i]] = statusCountCCProperty[typeList[i]][statusList[q]]; //add it to the dict
			} else {
				dataPicker.CCs["statuses"][q][typeList[i]] = 0; //otherwise, value is 0;
			}
		}
	}
	makePieChart(dataPicker.CCs.statuses, "chart_3", 0);

	
	//Count CVs and add to dataPicker
	var cvList = [];
	for (var i = 0; i < data2.length; i++){
		var folderRsn = data2[i].folderrsn;
		if (cvList.indexOf(folderRsn) < 0 ) {
			cvList.push(folderRsn);
		}
	}
	//add an attribute to cc cases (data1) indicating if the case has a CV (true) or not (false)
	for (var q = 0; q < data1.length; q++){ //for every case
		if (cvList.indexOf(data1[q].folderrsn) > -1 ) { //if the case folder rsn is on the cv list
			data1[q]["hasCV"] = true;			//it has a cv
		} else { 
			data1[q]["hasCV"] = false;  
		}
	}
	
	//populate stats and table
	populateTable();
	populateInfoStat("info1", data1);
	populateInfoStat("info2", data1);
} //end groupDataObjects

function makeObjectsEqual(dataObject, keyListReference) { //make all nested objects within an object the same length (or D3.layout.stack will fail)
	//assumes nested objects
	if (typeof keyListReference === 'undefined') {
		keyListReference = 0;
	} //default keyListReference
	if (keyListReference != 0) { //generate a new list of keys to reference. sometimes you might want to use the old one--when you're filtering down...it's hard to explain
		keyList = [];
		//generate list of unique keys
		for (var i in dataObject) { //for every object key in the object
			for (var q in dataObject[i]) { //and so on
				if (keyList.indexOf(q) < 0) { //if the key is not in key list, add it
					keyList.push(q);
				}
			}
		}
	}
	//make sure there is an object for every status type
	for (var z = 0; z < statusList.length; z++) { //for all statues

		if (!(statusList[z]in dataObject)) { //check for each status object
			dataObject[statusList[z]] = {}; //add empty status object if it doesn't exist
		}
	}

	//make sure same set of  keys exists in both active and status objects
	for (var i in dataObject) { //for every status key object key in the object
		for (var q = 0; q < keyList.length; q++) { //for every type key in key list (violation type or categorydesc)
			if (!(keyList[q]in dataObject[i])) { //if the key is not in the object
				dataObject[i][keyList[q]] = 0; //add the key and value is 0;
			}
		}
	}
} //end make objects equal

function formatForD3Stack(dataset) {
	//get a list of keys, sort it, work in that order
	var localKeyList = []
	for (var i in dataset) { //for every key in the rolled-up object (here, statuses (active or closed or pending...))
		for (var q in dataset[i]) { //for every key in that status
			if (localKeyList.indexOf(q) < 0) //if that key is not in the local key list
				localKeyList.push(q); //send that key to the localKeyList;
		}
	}
	localKeyList.sort();
	var stackFormatted = []; //<<this is the array that goes to D3 stack layout
	for (var i = 0; i < statusList.length; i++) { //for every status type (here, hardcoded as active or closed to avoid sorting issues)  < still true? 7/20/2015
		var temp = [];
		for (var q = 0; q < localKeyList.length; q++) { //for every key in each object key
			var status = statusList[i];
			var name = localKeyList[q];
			var count = dataset[statusList[i]][name];
			temp.push({
				"x" : name,
				"y" : count,
				"status" : status
			});
		}
		stackFormatted.push(temp);
	}
	var stack = d3.layout.stack();
	stack(stackFormatted); //adds y0 values to each data point
	return stackFormatted;
}

function createStackChart(dataset, divId, issue) { //where issue is 'CCs' or 'Defs'
	var alternateLabel = 1; //

	//not used
	var categoryCount = dataset[0].length; //get length of one of the datset arrays to determine how many columns will be created and adjust width; this is for style

	//Set up scales
	xScale = d3.scale.ordinal()
		.domain(d3.range(dataset[0].length))
		.rangeRoundBands([0, width], .1);

	var yScale = d3.scale.linear()
		.domain([0,
				d3.max(dataset, function (d) {
					return d3.max(d, function (d) {
						return d.y0 + d.y;
					});
				})
			])
		.range([0, height]);
	//send to master dict
	scaleDict[divId] = yScale;

	//y axis scale is separate from yScale1 so that the scale's tick labels are in descending order--couldn't figure out how to worth with the bars' yscale
	var yAxisScale = d3.scale.linear()
		.rangeRound([height, 0])
		.domain([0,
				d3.max(dataset, function (d) {
					return d3.max(d, function (d) {
						return d.y0 + d.y;
					});
				})
			]);

	//Set up axes
	var xAxis = d3.svg.axis()
		.scale(xScale)
		.orient("bottom")
		.tickSize(3)
		.tickFormat(function (d) {
			if (divId == "chart_4") { //alternate labels for time chart
				alternateLabel+=1;
				if (alternateLabel == 5) {
					alternateLabel = 1;
					var xLabel = formatMonth(new Date(dataset[0][d].x));
					return xLabel.trunc(10, false);
				} else {
					return ""
				}
			} else {
				var xLabel = dataset[0][d].x;
				return xLabel.trunc(10, false);
			}
		});

	var yAxis = d3.svg.axis()
		.scale(yAxisScale)
		.ticks(5)
		.tickSize(width)
		.tickFormat(function (d) {
			if (divId == "chart_4") { //% labels for time chart
				return formatPct(d);
			} else {
				return d;
			}
		})
		.orient("left");

	//Create SVG element
	var svg = d3.select("#" + divId)
		.append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom);

	//adjust the transform here to move the axis around
	//axis code here to put axis lines behind bars
	svg.append("g").attr("class", "x axis").attr("transform", "translate(" + margin.left + "," + (height + margin.top) + ")").call(xAxis).selectAll("text")
	.style("text-anchor", "end")
	.attr("dx", "-.8em")
	.attr("dy", ".15em")
	.attr("transform", function (d) {
		return "rotate(-35)"
	});

	svg.append("g").attr("class", "y axis").attr("transform", "translate(" + (width + margin.left) + "," + margin.top + ")").call(yAxis);

	//Create container with margin space
	var container = svg.append("g")
		.attr("class", "container")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Add a group for each row of data
	var groups = container.selectAll("g")
		.data(dataset)
		.enter()
		.append("g");

	// Add a rect for each data value
	var rects = groups.selectAll("rect")
		.data(function (d) {
			return d;
		})
		.enter()
		.append("rect")
		.attr("class", function (d) {
			var violation = d.x;
			return "stacked-bar " + d.status + " " + issue;
		})
		.attr("issue", issue)
		.attr("violation", function (d) {
			return d.x;
		})
		.attr("x", function (d, i) {
			return xScale(i);
		})
		.attr("y", function (d) {
			return height; //initialize at height for page load transition effect
		})
		.attr("height", function (d) {
			return 0; //initialize at 0 for page load transition effect
		})
		.attr("width", xScale.rangeBand());

	//after initial chart, update with all datasets to create transition effect
	updateBarChart(divId, dataset, 750, scaleDict[divId]);
} //end createStackChart

function updateBarChart(divId, dataset, duration, yScale) {
	if (typeof duration === 'undefined') {
		duration = 750;
	} //default duration can be overridden
	//set up scales again (remove if you want consistent scales throughout...though you will need to deal with scale conflicts between defs and ccs
	xScale
	.domain(d3.range(dataset[0].length))
	.rangeRoundBands([0, width], .1);

	var yScale = d3.scale.linear() //remove to disable Y scale transitions (see other notes below)
		.domain([0,
				d3.max(dataset, function (d) {
					return d3.max(d, function (d) {
						return d.y0 + d.y;
					});
				})
			])
		.range([0, height]);

	for (var i = 0; i < statusList.length; i++) {
		var status = statusList[i];
		d3.select("#" + divId).selectAll("." + status).data(dataset[i])
		.transition().ease("quad") //transition 'Active' class
		.duration(function (d, i) {
			return duration;
		})
		.attr("y", function (d) {
			return height - yScale(d.y0) - yScale(d.y);
		})
		.attr("height", function (d) {
			return yScale(d.y);
		})
	};

	var yAxisScale = d3.scale.linear() //remove to disable Y scale transitions (see other notes below)
		.rangeRound([height, 0])
		.domain([0,
				d3.max(dataset, function (d) {
					return d3.max(d, function (d) {
						return d.y0 + d.y;
					});
				})
			]);

	var yAxis = d3.svg.axis()
		.scale(yAxisScale)
		.ticks(5)
		.tickSize(width)
		.tickFormat(function (d) {
			if (divId == "chart_4") { //% labels for time chart
				return formatPct(d);
			} else {
				return d;
			}
		})
		.orient("left");

	// y axis transition would go here, but this you will need to create separate axes for defs and ccs.
	d3.select("#" + divId).selectAll(".y").transition().duration(duration).ease("quad").call(yAxis);
}

function makePieChart(dataset, divId) {

	var radius = Math.min(width, height) / 2;

	// format for pie chart
	pie = d3.layout.pie()
		.sort(null)
		.value(function (d) {
			return d.fake;
		});

	arc = d3.svg.arc()
		.outerRadius(radius)
		.innerRadius(radius - 50);

	var svg = d3.select("#" + divId).append("svg")
		.attr("width", width)
		.attr("height", height)
		.append("g")
		.attr("transform", "translate(" + width / 2 + "," + height / 2 + ")");

	path1 = svg.datum(dataset).selectAll("path")
		.data(pie)
		.enter().append("g").attr("class", "arc").attr("id", "pie")
		.append("path").attr("class", function (d) {
			return (d.data.status);
		})
		.attr("d", arc)
		.each(function (d) {
			this._current = d;
		}); // store the initial angles

	svg.selectAll(".arc").append("text")
	.attr("transform", function (d) {
		return "translate(" + arc.centroid(d) + ")";
	})
	.attr("dy", ".35em")
	.style("text-anchor", "middle")
	.attr("class", "pieText")
	.text(function (d) {
		return d.data.status;
	});

	svg.append("g").append("text")
	.style("text-anchor", "middle")
	.attr("class", "info")
	.html(function (d) {
		//var active = +d[0].all;
		//var closed = +d[1].all;
		// var pending = +d[2].all;
		//return formatPct(closed/(active+closed+pending));
		return 0; //dummy value for initial transition
	});

	svg.append("g").append("text")
	.style("text-anchor", "middle")
	.attr("class", "info-small")
	.attr("transform", "translate(0 20)")
	.text("Closed");

	//update for initial transition effect
	updatePieChart("all", dataPicker.CCs.statuses, 750);
} //end make pie chart

function updatePieChart(dataType, dataset, duration) {
	if (typeof duration === 'undefined') {
		duration = 500;
	} //default duration can be overridden
	var value = dataType;
	pie.value(function (d) {
		return d[value];
	}); // change the value function
	path1 = path1.data(pie); // compute the new angles
	path1.transition().ease("quad").duration(duration).attrTween("d", arcTween); // redraw the arcs
	//update info text
	d3.select("#chart_3").select(".info").transition().duration(750).ease("quad")
	.tween("text", function (d) {
		var start = parseFloat(this.textContent); //parse out the % symbol - good job, javascript!
		if (isNaN(start)){
			start = 0;
		}
		var active = +d[0][dataType];
		var closed = +d[1][dataType];
		var pending = +d[2][dataType];
		pctClosed = (closed / (active + closed + pending)) * 100;
		//console.log(start + " " + pctClosed);
		var i = d3.interpolate(start, pctClosed)
			return function (t) {
			//console.log(Math.round(i(t)) / 100);
			this.textContent =Math.round(i(t)) / 100;
		}
	})
	//update text label locations...this took way longer than it needed to because your selections were crap
	arcData = [];
	d3.selectAll("#pie").selectAll("path").each(function (d) {
		arcData.push(d)
	}) //get new path data
	//move text
	d3.selectAll(".pieText").data(arcData).transition().ease("quad").duration(duration).attr("transform", function (d) {
		if (d.value == 0) {
			return "";
		} else {
			return "translate(" + arc.centroid(d) + ")";
		}
	})
} //end update pie chart

function arcTween(a) {
	// Store the displayed angles in _current.
	// Then, interpolate from _current to the new angles.
	// During the transition, _current is updated in-place by d3.interpolate
	var i = d3.interpolate(this._current, a);
	this._current = i(0);
	return function (t) {
		return arc(i(t));
	};
}

function prepareTimeStackChart(dataset) {
	var start = new Date("4/13/2015"); //start in april when first cases were created
	var today = new Date();
	var weekArray = d3.time.weeks(start, today); //create an array of weeks from the project start to present
	masterDict = {
		"all" : {},
		"Neighborhood" : {},
		"Multifamily" : {},
		"Commercial" : {}

	} //expand to include mf, comm, nb...
	//construct master dictionary of all weeks elapsed since beginning of record-keeping...if you want to go by days instead of weeks, just change the time format d3.time.weeks
	for (var q = 0; q < statusList.length; q++) {
		masterDict.all[statusList[q]] = {};
		for (var i = 0; i < weekArray.length; i++) {
			var dayNumber = formatDate(weekArray[i]);
			masterDict.all[statusList[q]][dayNumber] = 0; //set the incident count for each status-day at 0--we add to this count below
		}
	}
	//count up case events by status
	for (var i = 0; i < dataset.length; i++) {
		var status = dataset[i].status;
		var openedDay = new Date(dataset[i].date_opened)
			var lastUpdated;
		if (dataset[i].last_update) {
			lastUpdated = new Date(dataset[i].last_update) //need to replace with closed date
		} else {
			lastUpdated = openedDay;
		} //if case has never been updated, last update is opened date
		if (!(status == "Closed")) { //if case is open or pending
			for (var q = 0; q < weekArray.length; q++) { //for every week since we started
				if (weekArray[q] >= openedDay) { //if the week date is greater than or equal to the opened date
					masterDict.all[status][formatDate(weekArray[q])] += 1; //add one to the status/count for that day
				}
			}
		}
		if (status == "Closed") { //if case is closed
			for (var q = 0; q < weekArray.length; q++) { //for every day since we started
				if (weekArray[q] >= lastUpdated) { //if the day is greater than or equal to the last update date
					masterDict.all[status][formatDate(weekArray[q])] += 1; //add one to the status/count for that day
				}
				if (weekArray[q] >= openedDay) { //if the day is after or equal to the opened date...
					if (weekArray[q] < lastUpdated) { //...and before the closed date
						masterDict.all.Active[formatDate(weekArray[q])] += 1; //add one to the active count (can't show historical pending, so they disapear over time)
					}
				}
			}
		}
	}

	//count up case events by property type and status
	//add week dates for each property type to dict
	for (var z = 0; z < typeList.length; z++) { //for every kind of property type
		for (var q = 0; q < statusList.length; q++) { //for every kind of status
			masterDict[typeList[z]][statusList[q]] = {}; //create empty status object for that property type
			for (var i = 0; i < weekArray.length; i++) {
				var dayNumber = formatDate(weekArray[i]);
				masterDict[typeList[z]][statusList[q]][dayNumber] = 0; //set the incident count for each status-day at 0--we add to this count below
			}
		}
	}
	for (var i = 0; i < dataset.length; i++) {
		var status = dataset[i].status;
		var propertyType = dataset[i].case_type;
		if (propertyType == "N/A") {
			continue;
		};
		var openedDay = new Date(dataset[i].date_opened)
			var lastUpdated;
		if (dataset[i].last_update) {
			lastUpdated = new Date(dataset[i].last_update) //need to replace with closed date
		} else {
			lastUpdated = openedDay;
		} //if case has never been updated, last update is opened date
		if (!(status == "Closed")) { //if case is open or pending
			for (var q = 0; q < weekArray.length; q++) { //for every week since we started
				if (weekArray[q] >= openedDay) { //if the week date is greater than or equal to the opened date
					masterDict[propertyType][status][formatDate(weekArray[q])] += 1; //add one to the status/count for that day
				}
			}
		}
		if (status == "Closed") { //if case is closed
			for (var q = 0; q < weekArray.length; q++) { //for every day since we started
				if (weekArray[q] >= lastUpdated) { //if the day is greater than or equal to the last update date
					masterDict[propertyType][status][formatDate(weekArray[q])] += 1; //add one to the status/count for that day
				}
				if (weekArray[q] >= openedDay) { //if the day is after or equal to the opened date...
					if (weekArray[q] < lastUpdated) { //...and before the closed date
						masterDict[propertyType].Active[formatDate(weekArray[q])] += 1; //add one to the active count (can't show historical pending, so they disapear over time)
					}
				}
			}
		}
	}
	//create the intial stack
	createStackChart(formatForD3TimeStack(masterDict.all), "chart_4", "time"); //returns a stacked bar chart-friendly array; masterDict.all has an array for each status type, with each object key being a day of the year (by number) and the number of cases of that status on that day
	//and also send the masterDict data to the data picker (for button transitions)
	dataPicker["Time"] = {};
	dataPicker.Time.all = formatForD3TimeStack(masterDict.all);
	for (var i = 0; i < typeList.length; i++) {
		dataPicker.Time[typeList[i]] = formatForD3TimeStack(masterDict[typeList[i]]);
	}
}

function formatForD3TimeStack(dataset) {
	//get a list of keys, sort it, work in that order
	var localKeyList = []
	for (var i in dataset) { //for every key in the rolled-up object (here, statuses (active or closed or pending...))
		for (var q in dataset[i]) { //for every key in that status
			if (localKeyList.indexOf(q) < 0) //if that key is not in the local key list
				localKeyList.push(q); //send that key to the localKeyList;
		}
	}
	localKeyList.sort();
	john = [];
	var stackFormatted = []; //<<this is the array that goes to D3 stack layout
	for (var i = 0; i < statusList.length; i++) { //for every status type
		var temp = [];
		for (var q = 0; q < localKeyList.length; q++) { //for every key in each object key
			var status = statusList[i];
			var name = localKeyList[q];
			var count = dataset[statusList[i]][name];
			temp.push({
				"x" : name,
				"y" : count,
				"status" : status
			});
		}
		stackFormatted.push(temp);
		john.push(temp);
	}
	var stack = d3.layout.stack().offset("expand"); //remove "expand" to make chart a normal stack
	stack(stackFormatted); //adds y0 values and converts to percentage for each data point
	return stackFormatted;
}

function populateTable() {
	var rows = d3.select("tbody").selectAll("tr").data(data1).enter().append("tr").attr("class", "tableRow");

	d3.select("tbody").selectAll("tr")
	.each(function (d) {
		d3.select(this).append("td").html(d.casenumber);
		d3.select(this).append("td").html(d.address);
		d3.select(this).append("td").html(d.case_type);
		d3.select(this).append("td").html(d.primary_reported_violation);
		d3.select(this).append("td").attr("class", d.status).html(d.status);
		d3.select(this).append("td").html(function(d){
			return (d.hasCV == true) ? "Yes":"No";
		})
		d3.select(this).append("td").html(d.inspector_name);
		d3.select(this).append("td").html(formatDate(new Date(d.date_opened)));
		d3.select(this).append("td").html(function () {
			if (!(d.last_update)) {
				return ""
			} else {
				return d3.round(((new Date()) - (new Date(d.last_update))) / (86400000)) + " days ago"; //today's date minus last updated divided my number of miliseconds in a day
			}
		})
	})
	//d3.select(this).append("td").html(d3.round(((new Date()) - (new Date(d.last_update * 1000))) / (1000*60*60*24)) + " days ago");

	//activate sorting/search functionality
	$(document).ready(function () {
		$('#caseTable').DataTable({
			paging : false
		});
	});
} //end populateTable

function updateTable(dataType) {
	d3.select("tbody").selectAll("tr").selectAll("td").remove()

	d3.select("tbody").selectAll("tr")
	.filter(function (d) {
		if (dataType == "all") {
			return true;
		} else {
			return d.case_type == dataType;
		}
	})
	.each(function (d) {
		d3.select(this).append("td").html(d.casenumber);
		d3.select(this).append("td").html(d.address);
		d3.select(this).append("td").html(d.case_type);
		d3.select(this).append("td").html(d.primary_reported_violation)
		d3.select(this).append("td").attr("class", d.status).html(d.status);
		d3.select(this).append("td").html(function(d){
			return (d.hasCV == true) ? "Yes":"No";
		})
		d3.select(this).append("td").html(d.inspector_name);
		d3.select(this).append("td").html(formatDate(new Date(d.date_opened)))
		d3.select(this).append("td").html(function () {
			if (!(d.last_update)) {
				return ""
			} else {
				return d3.round(((new Date()) - (new Date(d.last_update))) / (86400000)) + " days ago"; //today's date minus last updated divided my number of miliseconds in a day
			}
		})
	})
}

function populateInfoStat(divId, dataset) {
	var count = 0;
	d3.select("#" + divId).append("text").attr("class", "infoStat").text(count);
	updateInfoStat(divId, dataset, "all");
}

function updateInfoStat(divId, dataset, dataType) {
	var count = 0;
	if (dataType == "all") {
		if (divId == "info2") {
			//count CV folders (unique cases with deficincies)
			for (var i = 0; i < dataset.length; i++) { //for every case with a categorydesc
				if (dataset[i].hasCV == true){
					count++;
				}
				
			}
		} else {
			count = dataset.length;
		}
	} else {
		if (divId == "info2") {
			for (var i = 0; i < dataset.length; i++) {
				if (dataset[i].case_type == dataType) {
					if (dataset[i].hasCV == true){
						count++;
					}
				}
			}
		}
		if (divId == "info1") {
			for (var i = 0; i < dataset.length; i++) {
				if (dataset[i].case_type == dataType) {
					count += 1;
				}
			}
		}
	}
	d3.select("#" + divId).select("text").transition().duration(750).ease("quad")
	.tween("text", function () {
		var i = d3.interpolate(this.textContent, count)
			return function (t) {
			this.textContent = Math.round(i(t));
		}
	})
}

function compare(a, b) { //for sorting dataobjects for table population - not currently used
	if (a.case_type < b.case_type)
		return -1;
	if (a.case_type > b.case_type)
		return 1;
	return 0;
}

function browserAlert() {
	if ((navigator.userAgent.indexOf("MSIE") != -1) || (!!document.documentMode == true)) //IF IE > 10
	{
		alert('The NET Dashboard is not designed for Internet Explorer. Switch to Firefox or Chrome browser for optimal viewing');
	}
}

//change drop-downs to selects
//see here: http://stackoverflow.com/questions/18150954/how-can-i-render-a-list-select-box-dropdown-with-bootstrap
$(".dropdown-menu li a").click(function () {
	var selText = $(this).text();
	$(this).closest('div').find('button[data-toggle="dropdown"]').html(selText + ' <span class="caret"></span>');
});