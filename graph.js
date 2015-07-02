/**
 * Created by Remington on 6/23/2015.
 */
Pace.start(); //start the loading screen


var start = new Date(); //start counting load time
var end;

var mode = function mode(arr) { // function to quickly find the mode
    var numMapping = {};
    var greatestFreq = 0;
    var mode;
    arr.forEach(function findMode(number) {
        numMapping[number] = (numMapping[number] || 0) + 1;

        if (greatestFreq < numMapping[number]) {
            greatestFreq = numMapping[number];
            mode = number;
        }
    });
    return +mode;
};

var median = function median(values) { // function to quickly find the median

    values.sort( function(a,b) {return a - b;} );

    var half = Math.floor(values.length/2);

    if(values.length % 2)
        return values[half];
    else
        return (values[half-1] + values[half]) / 2.0;
};

function make_y_axis() { // function to create y grid
    return d3.svg.axis()
        .scale(y)
        .orient("left")
}

// initialize variables
var bisectDate = d3.bisector(function(d) { return d.Date; }).left;
var finalData = [];
var filter;
var lineType = "Mean";
var filteredData = [];
var minDate;
var maxDate;
var minScale = 1;
var maxScale = 20;
var areaType; // for printing settings
//add line below to fix image output for high res displays
//must also change width to be multiplied by pixel ratio
//var pixelRatio = window.devicePixelRatio || 1;
var margin = {top: 40, right: 110, bottom: 52, left: 50},
    width = setup.graphWidth  - margin.left - margin.right,
    height = 600 - margin.top - margin.bottom;

var parseDate = d3.time.format("%m/%d/%Y").parse;
var formatDate = d3.time.format("%b %d %Y");

var x = d3.time.scale()
    .range([0, width]);

var y = d3.scale.linear()
    .range([height, 0]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");

var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

var line = d3.svg.line()
    .x(function(d) { return x(d.Date); })
    .y(function(d) {
        return y(d.Value);
    });
var area = d3.svg.area()
    .x(function(d) { return x(d.Date); })
    .y0(function(d) { return y(d.Min); })
    .y1(function(d) { return y(d.Max); });


var svg = d3.select("#chart").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


d3.csv("StorageLog.csv", function(data){
    var regionNames = Object.keys(data[0]); // grab all keys and put to an array
    regionNames.splice(0,2); // splice the first two columns (Replication id and date)
    d3.select("#container").html("<h2>Choose a " + setup.columnType.toLowerCase() + "</h2>");
    for (i = 0; i < data.length; i++) {
        if (!(_.findWhere(finalData, {Date: data[i].Date}))) { // if the date isn't in finalData
            finalData.push({Date: data[i].Date});              // push it to finalData
            var index = finalData.map(function(d) {return d.Date;}).indexOf(data[i].Date); //find where finalData has the same date as data
            for (j = 0; j < regionNames.length; j++){ //majority of time spent in this loop
                var temp = {};
                temp[regionNames[j]] = {Values: [], Min: 0, Max: 0, Mean: 0, Mode: 0, Median: 0, Sum: 0};
                _.extend(finalData[index], temp); // Each region name on each will have its own properties
            }
        }
    }
    filter = regionNames[1]; // set filter to a region name so filterData can work
    var regionMenu = d3.select("#container") // create drop down menu for regions
        .append("select")
        .attr("name","region-list").attr("id", "regionList");

    var options = regionMenu.selectAll("option")
        .data(regionNames).enter().append("option"); // populate regionMenu
    options.text(function(d) {return d;}).attr("value", function(d) {return d});  // give values to each region
    $("#regionList").val(filter); // set regionsList to the initial filter value (regionNames[1])
    regionMenu.on("change", regionChanged); // listen for change on regionMenu

    d3.select("#pArea").on("input", function() { //when the slider for P(x) changes,
        updateTop(+this.value);                  //run updateTop function with the slider value
    });

    for (j = 0; j < finalData.length; j++) { //push the multiple replication values for each region
        for (i = 0; i < data.length; i++) {  //on each day to the final array
            if (data[i].Date == finalData[j].Date) {
                for (k=0; k < regionNames.length; k++){
                    finalData[j][regionNames[k]].Values.push(parseInt(data[i][regionNames[k]]));
                }
            }
        }
    }
    for (i = 0; i < finalData.length; i++){
        finalData[i].Date = parseDate(finalData[i].Date);
        for(j = 0; j < regionNames.length; j++) { //set the important values for easy calculations
            for (k = 0; k < finalData[i][regionNames[j]].Values.length; k++) { //Sum the values for each region each day
                finalData[i][regionNames[j]].Sum += parseInt(finalData[i][regionNames[j]].Values[k]);
            }
            finalData[i][regionNames[j]].Mean = finalData[i][regionNames[j]].Sum/finalData[i][regionNames[j]].Values.length;
            finalData[i][regionNames[j]].Mode = mode(finalData[i][regionNames[j]].Values);
            finalData[i][regionNames[j]].Median = median(finalData[i][regionNames[j]].Values);
            finalData[i][regionNames[j]].Min = _.min(finalData[i][regionNames[j]].Values);
            finalData[i][regionNames[j]].Max = _.max(finalData[i][regionNames[j]].Values);
        }
    }

    if (setup.showDashboard == false) {
        // filter = setup.column != "" ? setup.column : regionNames[0]; //if nothing chosen, set a default
        lineType = setup.centerLine !== "" ? setup.centerLine : "Mean";
        $("#lineType").val(lineType);
        if (setup.areaType.charAt(0) == "P" || setup.areaType.charAt(0) == "p") {
            var temp = setup.areaType.match(/\d/g);
            temp = temp.join("");
            $("#areaType").val("pr");
            p = temp;
            $("#pArea").val(temp);
        }
        else {
            $("#areaType").val(setup.areaType);
            areaType = setup.areaType;
        }
        $("#dashboard").hide();
    }

    filteredData = filterData(finalData); //filter the data depending on line type, area type, and region
    minDate = d3.min(filteredData, function(d) {return d.Date;}); // set min and max date for future use
    maxDate = d3.max(filteredData, function(d) {return d.Date;});
    x.domain(d3.extent(filteredData, function(d) { return d.Date; }));
    y.domain([0, d3.max(filteredData, function(d) {return d.Max;})]);


    //////////////////////////////////////////////////////////////////////////////////Begin drawing
    //Main chart
    svg.append("rect") // needed white background behind printed graph
        .attr("x", "-50px")
        .attr("y", "-30px")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.bottom + margin.top)
        .attr("fill", "white");

    svg.append("image") //put SN logo on the chart
        .attr("xlink:href", "image.jpg")
        .attr("width", 153)
        .attr("height", 44)
        .attr("x", width - margin.right - 35)
        .attr("y", -40);

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis)
        .select("path")
        .attr("display", "none");

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
        .select("path").attr("fill", "none")
        .attr("stroke", "#000")
        .attr("shape-rendering", "crispEdges")
        .select("line").attr("fill", "none")
        .attr("stroke", "#000")
        .attr("shape-rendering", "crispEdges")
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text("Modules");


    svg.append("g")
        .attr("class", "grid")
        .call(make_y_axis()
            .tickSize(-width, 0, 0)
            .tickFormat("")).attr("stroke", "lightgrey").attr("opacity", "0.7");

    svg.append("defs")
        .append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    svg.append("path")
        .datum(filteredData)
        .attr("class", "area")
        .attr("fill", "lightsteelblue")
        .attr("stroke-width", "0")
        .attr("d", area).attr("clip-path", "url(#clip)");

    svg.append("path")
        .datum(filteredData)
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "steelblue")
        .attr("stroke-width", "1.5px")
        .attr("d", line)
        .attr("clip-path", "url(#clip)");

    svg.append("text") //title
        .attr("x", (width / 2))
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("text-decoration", "underline")
        .text(setup.title);


    svg.append("rect")
        .attr("class", "overlay")
        .attr("fill", "none")
        .attr("width", width)
        .attr("height", height)
        .on("mouseover", function() { focus.style("display", null); })
        .on("mouseout", function() { focus.style("display", "none"); })
        .on("mousemove", mousemove);

    //Drawing tool tip
    var focus = svg.append("g")
        .attr("class", "focus")
        .style("display", "none");

    if (setup.showToolTip == true) {
        focus.append("circle")
            .attr("r", 4.5);

        focus.append("rect")
            .attr("dy", '10px')
            .attr("x", "7px")
            .attr("fill", "white")
            .attr("opacity", ".5")
            .attr("width", "110px")
            .attr("height", "55px").on("mouseover", function() {});

        focus.append("text")
            .attr("id", "date")
            .attr("x", 9)
            .attr("dy", "13px");

        focus.append("text")
            .attr("id", "value")
            .attr("x", 9)
            .attr("dy", "26px");


        focus.append("text")
            .attr("id", "min")
            .attr("x", 9)
            .attr("dy", "39px");

        focus.append("text")
            .attr("id", "max")
            .attr("x", 9)
            .attr("dy", "52px");
    }

    if (setup.showLoadTime == false) {
        $("#loadTime").hide();
    }
    //Drawing nav chart below
    var navWidth = width,
        navHeight = 132 - margin.top - margin.bottom;

    var navChart = d3.select('#chart').classed('chart', true).append('svg')
        .classed('navigator', true)
        .attr('width', navWidth + margin.left + margin.right)
        .attr('height', navHeight + margin.top + margin.bottom)
        .append('g')
        .attr('transform', 'translate(' + margin.left + ',' + 0 + ')');

    var navXScale = d3.time.scale()
            .domain(d3.extent(filteredData, function(d) { return d.Date; }))
            .range([0, navWidth]),
        navYScale = d3.scale.linear()
            .domain([0, d3.max(filteredData, function(d) {return d.Max;})])
            .range([navHeight, 0]);

    var navData = d3.svg.area()
        .x(function (d) { return navXScale(d.Date); })
        .y0(function (d) { return navYScale(d.Min); })
        .y1(function (d) { return navYScale(d.Max); });

    var navLine = d3.svg.line()
        .x(function (d) { return navXScale(d.Date); })
        .y(function (d) { return navYScale(d.Value); });


    var navXAxis = d3.svg.axis()
        .scale(navXScale)
        .orient('bottom');

    navChart.append("defs")
        .append("clipPath")
        .attr("id", "navClip")
        .append("rect")
        .attr("width", navWidth)
        .attr("height", navHeight);


    navChart.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + navHeight + ')')
        .call(navXAxis);

    navChart.append('path')
        .attr('class', 'navArea') //draw the area on the nav chart
        .attr('d', navData(filteredData)).attr("clip-path", "url(#navClip)");

    navChart.append('path')
        .attr('class', 'navLine')//draw the line on the nav chart
        .attr('d', navLine(filteredData)).attr("clip-path", "url(#navClip)");

    var viewport = d3.svg.brush() //create viewport that zooms on main chart depending on ends
        .x(navXScale)
        .on("brush", function () { //redraw chart when dragging
            x.domain(viewport.empty() ? navXScale.domain() : viewport.extent());
            redrawChart();
        })
        .on("brushend", function () {  //update zoom when done dragging
            updateZoomFromChart();
        });

    navChart.append("g")
        .attr("class", "viewport")
        .call(viewport)
        .selectAll("rect")
        .attr("height", navHeight);
    ///////////////////////////////////////////////////////////////////////////////////end of drawing


    var zoom = d3.behavior.zoom()
        .x(x)
        .on('zoom', function() {
            zoom.scaleExtent([minScale, maxScale]); //keep the user from zooming too far in or out
            if (x.domain()[0] < minDate) { // don't let the user go past the first or last day
                zoom.translate([zoom.translate()[0] - x(minDate) + x.range()[0], 0]);
            } else if (x.domain()[1] > maxDate) {
                zoom.translate([zoom.translate()[0] - x(maxDate) + x.range()[1], 0]);
            }
            redrawChart();
            updateViewpointFromChart();
        });
    zoom.scaleExtent([minScale, maxScale]);

    if (setup.enableControls == true) {
        svg.call(zoom);
    }

    if (setup.showNav == false) {
        d3.select(".navigator").attr("display", "none")
    }

    function redrawChart() {
        var svg = d3.select("#chart");
        svg.select(".area")   // change the area
            .attr("d", area(filteredData))
            .attr("clip-path", "url(#clip)");
        svg.select(".line")   // change the line
            .attr("d", line(filteredData))
            .attr("clip-path", "url(#clip)");
        svg.select('.x.axis').call(xAxis);
        svg.select(".grid").call(make_y_axis().tickSize(-width, 0, 0).tickFormat(""));
    }

    function updateViewpointFromChart() {
        // stops the user from dragging the viewport past the first or last day
        if ((x.domain()[0] <= minDate) && (x.domain()[1] >= maxDate)) {
            viewport.clear();
        }
        else {

            viewport.extent(x.domain());
        }

        navChart.select('.viewport').call(viewport);
    }

    function updateZoomFromChart() {

        zoom.x(x);

        var fullDomain = maxDate - minDate,
            currentDomain = x.domain()[1] - x.domain()[0];

        minScale = currentDomain / fullDomain;
        maxScale = minScale * 20;

        zoom.scaleExtent([minScale, maxScale]);
    }

    function regionChanged() {
        filter = d3.event.target.value; // filter is set to the value of the region menu
        filteredData = filterData(finalData);
        x.domain(d3.extent(filteredData, function(d) { return d.Date; }));
        y.domain(d3.extent(filteredData, function(d) {return d.Max;}));
        navYScale.domain([0, d3.max(filteredData, function(d) {return d.Max;})]);
        // redraw new region line
        var svg = d3.select("#chart").transition();
        svg.select(".area")   // change the line
            .duration(750)
            .attr("d", area(filteredData));
        svg.select(".line")   // change the line
            .duration(750)
            .attr("d", line(filteredData));
        svg.select(".navArea")   // change the line
            .duration(750)
            .attr("d", navData(filteredData));
        svg.select(".navLine")   // change the line
            .duration(750)
            .attr("d", navLine(filteredData));
        svg.select(".x.axis") // change the x axis
            .duration(750)
            .call(xAxis);
        svg.select(".y.axis") // change the y axis
            .duration(750)
            .call(yAxis);
        svg.select(".grid").call(make_y_axis().tickSize(-width, 0, 0).tickFormat(""));
        navYScale.domain([0, d3.max(filteredData, function(d) {return d.Max;})]);
        viewport.clear();
        svg.duration(0).select('.viewport').call(viewport);
        updateViewpointFromChart();
        updateZoomFromChart();//reset zoom for both charts
    }

    function updateTop(pArea) {
        p = pArea;
        d3.select("#pArea-value").text(pArea); //adjust the text on the range slider
        d3.select("#pArea").property("value", pArea); //actually change the value

        var topPercent = 1-((100 - pArea)/200);
        var botPercent = (100 - pArea)/200;
        filteredData.forEach(function(d) { //Narrow min and max of area depending on p slider value
            d.Max = d.forArea[ Math.round(topPercent * (d.forArea.length-1))];
            d.Min = d.forArea[Math.round(botPercent * (d.forArea.length-1))];
        });
        // only need to redraw area
        var svg = d3.select("#chart").transition();
        svg.select(".area")   // change the line
            .duration(750)
            .attr("d", area(filteredData));
        svg.select(".navArea")   // change the line
            .duration(750)
            .attr("d", navData(filteredData));
    }

    $("#lineType").on("change", function() {
        lineType = $(this).val();
        filteredData = filterData(finalData); //Change the center line depending on if you want mean, median, or mode
        var svg = d3.select("#chart").transition();
        // only need to redraw line
        svg.select(".line")   // change the line
            .duration(750)
            .attr("d", line(filteredData));
        svg.select(".y.axis") // change the y axis
            .duration(750)
            .call(yAxis);
        svg.select(".navLine")   // change the line
            .duration(750)
            .attr("d", navLine(filteredData));
    });

    $("#areaType").on("change", function() { // different areaType handler
        if ($(this).val() == "minmax") {
            $("#pr").hide(); // hide pArea slider
            filteredData.forEach(function(d) {
                d.Max = Math.max.apply(Math, d.forArea); //find min and max
                d.Min = Math.min.apply(Math, d.forArea);
            });
            var svg = d3.select("#chart").transition();
            // only need to redraw area
            svg.select(".area")   // change the line
                .duration(750)
                .attr("d",  area(filteredData));
            svg.select(".navArea")   // change the line
                .duration(750)
                .attr("d", navData(filteredData));
        }
        else if ($(this).val() == "pr") {
            $("#pr").show(); //show slider when set to P(x)
        }
        else { //otherwise use confidence interval and calculate
            $("#pr").hide();
            var temp = $(this).val();
            $("#lineType").val("Mean");
            lineType = "Mean"; // no point in using median or mode for confidence interval
            filteredData = filterData(finalData);
            $("#areaType").val(temp);
            if ($(this).val() == 99) {
                filteredData.forEach(function(d) {
                    d.Max = (d.Value + (d.stdDev * 2.57583));
                    d.Min = (d.Value - (d.stdDev * 2.57583));
                });
            }
            else if ($(this).val() == 98){
                filteredData.forEach(function(d) {
                    d.Max = (d.Value + (d.stdDev * 2.326));
                    d.Min = (d.Value - (d.stdDev * 2.326));
                });
            }
            else if ($(this).val() == 95){
                filteredData.forEach(function(d) {
                    d.Max = (d.Value + (d.stdDev * 1.960));
                    d.Min = (d.Value - (d.stdDev * 1.960));
                });
            }
            else if ($(this).val() == 90){
                filteredData.forEach(function(d) {
                    d.Max = (d.Value + (d.stdDev * 1.645));
                    d.Min = (d.Value - (d.stdDev * 1.645));
                });
            }
            else if ($(this).val() == 80){
                filteredData.forEach(function(d) {
                    d.Max = (d.Value + (d.stdDev * 1.282));
                    d.Min = (d.Value - (d.stdDev * 1.282));
                });
            }
            else if ($(this).val() == 70){
                filteredData.forEach(function(d) {
                    d.Max = (d.Value + (d.stdDev * 1.036));
                    d.Min = (d.Value - (d.stdDev * 1.036));
                });
            }
            var svg = d3.select("#chart").transition();
            svg.select(".area")   // change the area
                .duration(750)
                .attr("d",  area(filteredData));
            svg.select(".navArea")   // change the navArea
                .duration(750)
                .attr("d", navData(filteredData));

        }
    });

    d3.select("#save").on("click", function() { // save button handler
        var $container = d3.select('#chart'),
        // Canvg requires trimmed content
            content = $container.html().trim(),
            canvas = document.getElementById('canvas'),
            context = canvas.getContext("2d");
        // Draw svg on canvas
        canvg(canvas, content);

        if ($("#areaType").val() == "minmax") {
            areaType = "Min and Max";
        }
        else if ($("#areaType").val() == "pr") {
            areaType = "P" + $("#pArea").val();
        }
        else {
            areaType = $("#areaType").val() + "% Confidence Interval"
        }
        context.font = "12px Arial"; //put settings on the image before it is downloaded
        context.fillText(setup.columnType + ": " + filter, 65, 47);
        context.fillText("Center: " + lineType, 65, 62);
        context.fillText("Area: " + areaType, 65, 77);
        // Change img be SVG representation
        canvg(canvas, content, {
            renderCallback: function() {
                var theImage = canvas.toDataURL('image/png');

                var a = document.createElement("a");
                a.download = "sample.png";
                a.href = theImage;
                a.click(); // this method only works in chrome
            }
        });
    });


    function mousemove() { // focus handler
        var x0 = x.invert(d3.mouse(this)[0]),
            i = bisectDate(filteredData, x0, 1);
        if (i > filteredData.length - 1) {
            i = filteredData.length - 2;
        }
        var d0 = filteredData[i - 1],
            d1 = filteredData[i],
            d = x0 - d0.Date > d1.Date - x0 ? d1 : d0;

        focus.attr("transform", "translate(" + x(d.Date) + "," + y(d.Value) + ")");
        focus.select("#value").text("Middle: " + Math.round(d.Value*100)/100); //necessary to round decimals
        focus.select("#date").text("Date: " + formatDate(d.Date));
        focus.select("#min").text("Bottom: " + Math.round(d.Min * 100)/100);
        focus.select("#max").text("Top: " + Math.round(d.Max * 100)/100);
    }
    end = new Date();
    d3.select("#loadTime").text("It took " + (end-start)/1000 + " seconds to load."); //calculate load time
}); // end of csv parse


function filterData (finalData){ // used to filter data. called everytime one of the drop down boxes values are changed
    var tempArray = [];
    for (i = 0; i < finalData.length; i++){
        var temp = {};
        var max = function() {
            var tempSort = _.sortBy(finalData[i][filter].Values, function(num) {return num});
            if ($("#areaType").val() == "minmax") {
                return finalData[i][filter].Max
            }
            else if ($("#areaType").val() == "pr") {
                var topPercent = 1-((100 - p)/200);

                return tempSort[Math.round(topPercent * (tempSort.length-1))];
            }
            else {
                if ($("#areaType").val() == 99) {
                    return (value + (d3.deviation(tempSort)* 2.57583));
                }
                else if ($("#areaType").val() == 98){
                    return (value + (d3.deviation(tempSort)* 2.326));
                }
                else if ($("#areaType").val() == 95){
                    return (value + (d3.deviation(tempSort)* 1.960));
                }
                else if ($("#areaType").val() == 90){
                    return (value + (d3.deviation(tempSort)* 1.645));
                }
                else if ($("#areaType").val() == 80){
                    return (value + (d3.deviation(tempSort)* 1.282));
                }
                else if ($("#areaType").val() == 70){
                    return (value + (d3.deviation(tempSort)* 1.036));
                }
            }
        };
        var min = function() {
            var tempSort = _.sortBy(finalData[i][filter].Values, function(num) {return num});
            if ($("#areaType").val() == "minmax") {
                return finalData[i][filter].Min
            }
            else if ($("#areaType").val() == "pr") {
                var botPercent = (100 - p)/200;

                return tempSort[Math.round(botPercent * (tempSort.length-1))];
            }
            else {
                if ($("#areaType").val() == 99) {
                    return (value - (d3.deviation(tempSort)* 2.57583));
                }
                else if ($("#areaType").val() == 98){
                    return (value - (d3.deviation(tempSort)* 2.326));
                }
                else if ($("#areaType").val() == 95){
                    return (value - (d3.deviation(tempSort)* 1.960));
                }
                else if ($("#areaType").val() == 90){
                    return (value - (d3.deviation(tempSort)* 1.645));
                }
                else if ($("#areaType").val() == 80){
                    return (value - (d3.deviation(tempSort)* 1.282));
                }
                else if ($("#areaType").val() == 70){
                    return (value - (d3.deviation(tempSort)* 1.036));
                }
            }
        };
        var value = finalData[i][filter][lineType];
        temp = {Date: finalData[i].Date,
            Value: value,
            Min: min(),
            Max: max(),
            stdDev: d3.deviation(finalData[i][filter].Values),
            forArea: _.sortBy(finalData[i][filter].Values, function(num) {return num})};
        tempArray.push(temp);
    }
    return tempArray;
}

