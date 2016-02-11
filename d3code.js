/// <reference path="d3.min.js" />

var width = 1200;
var height = 400;

var margin = { left:200, right:50,top:70,bottom:30};
var y = d3.scale.linear()
    .range([height,margin.top]);

var circleScale = d3.scale.linear()
    .range([5,50]);

var x= d3.scale.linear()
    .range([margin.left,width]);

var x1 = d3.scale.ordinal()
    .rangePoints([0, width+65],1);

d3.csv('class_query.csv',type,processQueryData);

function processQueryData(data){
    d3.csv('wordcountsperuser.csv',type2,function(wordCountsUser){
        d3.csv('wordCount.csv',type3,function(wordCountsTotal){
            d3.csv("cosine_sim.csv",type4,function(similarity){
                processWordData(wordCountsUser,wordCountsTotal,similarity);
            });
        });
    });

    var uidNest = d3.nest()
        .key(function (d) { return d.u_id;});
        //.entries(data);

    var queriesPerUser = uidNest.rollup(function(children){ return children.length;})
                                .entries(data);

    var queryTypesPerUser = uidNest.key(function(d){return d.intention;})
                            .rollup(function(children){ return children.length;})
                            .entries(data);

    var uniquequeriesPerUser = d3.nest()
        .key(function (d) { return d.u_id;}).key(function(d){return d.timestamp.toString();})
        .rollup(function(children){ return children.length;})
        .entries(data);

    //console.log(uniquequeriesPerUser);
    //console.log(queryTypesPerUser);
    queryCountCircles(queriesPerUser,uniquequeriesPerUser, queryTypesPerUser);
}

function queryCountCircles(data,uniqueData, queryTypes){
    x.domain([0,data.length]);
    x1.domain(data.map(function(d) { return d.key; }));
    y.domain([0,d3.max(data,function(d){ return d.values;})]);
    circleScale.domain([0,d3.max(data,function(d){ return d.values;})]);
    var barWidth = width/data.length;

    var xAxis = d3.svg.axis()
        .scale(x1)
        .orient("bottom")
        .tickSize(60);

    var bar = d3.select(".chart");
    var circle = d3.select(".circles");
    var color = d3.scale.category10();
    //console.log(color);



    var defineSvgAttr = function(svg) {
        return svg.attr('width', width+margin.right+margin.left)
            .attr('height', height)
            .selectAll("g")
            .data(data)
            .enter().append("g")
            .attr("transform", function (d, i) {
                return "translate(" + i * barWidth + ",0)";
            });
    };

    bar = defineSvgAttr(bar);
    bar.append("rect")
        .attr("x", function (d,i) {
            return x(i)/barWidth;
        })
        .attr("y", function(d) { return y(d.values); })
        .attr('height',function(d){ return height - y(d.values);})
        .attr('width',barWidth)
        .text(function(d){return d.values;})
        .on('mouseover', function(d,i){
            d3.select(this)
                .attr("y", function(d) { return y(uniqueData[i].values.length); })
                .attr('height', height - y(uniqueData[i].values.length));
            d3.select(this.parentNode).select("text")
                .attr("y", function(d) { return y(uniqueData[i].values.length)-6; })
                .text( function(d) { return uniqueData[i].values.length; });
        })
        .on('mouseout', function(d,i){
                d3.select(this)
                    .attr("y", function(d) { return y(d.values); })
                    .attr('height', height -  y(d.values));

                d3.select(this.parentNode).select("text")
                    .attr("y", function(d) { return y(d.values)-6; })
                    .text(function(d) { return d.values; });
            });

    bar.append("text")
        .attr("class","num")
        .attr("x", function (d,i) {
            return x(i)/barWidth;
        })
        .attr("y", function(d) { return y(d.values)-6; })
        .attr("dy", ".35em")
        .text(function(d) { return d.values; });

    var axis = d3.select(".axisSvg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", 100)
        .append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0,0)")
        .call(xAxis)
    .selectAll("text")
        .attr("transform", "translate(0,10) rotate(-90)")
        .attr("y", 15)
        .attr("dy", ".100em")
        .style("text-anchor", "end");

    circle = defineSvgAttr(circle);
    var queryTypes1 = [];
    //console.log(queryTypes);
    queryTypes.forEach(function(x){
        //console.log(type(x));
        var keys = [];
        var values = [];
        x.values.forEach(function(i){
            keys = keys.concat(i.key);
            values = values.concat(i.values);
        });
        queryTypes1=queryTypes1.concat( {"keys":keys,"values":values});
    });
    //console.log(queryTypes1);
    var flag = true;
    circle.append('circle')
        .attr("class","circleBoundary")
        .attr("cx", function (d,i) {
            return x(i)/barWidth;
        })
        .attr("cy", function(d) { return y(d.values); })
        .attr("r", function(d){ return circleScale(d.values);})
        .attr('width',barWidth)
        .style("fill", function(d,i) {
            var index = queryTypes1[i].values.indexOf(d3.max(queryTypes1[i].values));
            return color(queryTypes1[i].keys[index]);
        })
        .on('mouseover',function(d,i){ showPie(i,1)})
        .on('mouseout',function(d,i){ showPie(i,0)})
        .on('click',function(d){
            var c = d3.selectAll(".circleBoundary");
            if(flag==true) {
                c.style("fill", function (d, i) {
                    return color(d.values);
                });
                flag = false;
            }
            else{
                c.style("fill", function (d, i) {
                    var index = queryTypes1[i].values.indexOf(d3.max(queryTypes1[i].values));
                    return color(queryTypes1[i].keys[index]);
                });
                flag = true;
            }
        });


    circle.append('text')
        .attr("class","textBoundary")
        .attr("dx",function (d,i) {
            return x(i)/barWidth;
        })
        .attr("dy",function(d){return y(d.values);})
        .style("text-anchor","middle")
        .text(function(d){return d.key;});

    var size = 200;
    var radius = Math.min(size, size) / 2;
    var arc = d3.svg.arc()
        .outerRadius(radius - 10)
        .innerRadius(0);

    var labelArc = d3.svg.arc()
        .outerRadius(radius - 40)
        .innerRadius(radius - 40);

    var pie = d3.layout.pie()
        .sort(null)
        .value(function(d) {
            return d;
        });

    var svg = circle.append("svg")
        .attr("class","pie")
        .attr("width", size)
        .attr("height", size)
        .append("g")
        .attr("transform", "translate(" + size/2 + "," + size/2  + ")");


    var g = svg.selectAll('.arc')
        .data(function(d,i){return pie(queryTypes1[i].values);})
        .enter().append("g")
        .attr("class","arc");
    g.append('path')
        .attr("d",arc)
        .style("fill", function(d,i,ind){
            return color(queryTypes1[ind].keys[i]);
        });
    g.append("text")
        .attr("transform", function(d) { return "translate(" + labelArc.centroid(d) + ")"; })
        .attr("dy", ".35em")
        .text( function(d,i,ind){
            return queryTypes1[ind].values[i] + ' ' + queryTypes1[ind].keys[i];
        });

    function showPie(i,j){
        var pies = document.querySelectorAll(".pie");
        var texts = document.querySelectorAll(".textBoundary");
        var circles = d3.selectAll('.circleBoundary');

        if (j==1) {
            pies[i].style.visibility = "visible";
            d3.select("#uid").style("visibility","visible").attr("value",texts[i].innerHTML);
            //texts[i].style.visibility = "visible";
            circles.style({"opacity": "0.1", "transitionDelay":"3s","-webkit-transition-delay": "3s" });
        }
        else {
            d3.select("#uid").style("visibility","hidden");
            pies[i].style.visibility = "hidden";
            circles.style({"opacity": "1", "transitionDelay":"3s","-webkit-transition-delay": "3s" });
        }
    }
}



function processWordData(wordCountsUser,wordCountsTotal,similarity){

    console.log(wordCountsTotal);

    var color = d3.scale.linear()
        .domain([0,0.8,0.9,1])
            .range(["yellow","green","blue","red"]);

    //var color = d3.scale.category20b();

    var sim = d3.nest()
        .key(function(d){ return d.index;})
        .entries(similarity);

    var usersCount = d3.nest()
        .key(function(d){ return d.level_0;})
        .entries(wordCountsUser);

    rectWidth = 40;
    wordWidth = 300;

    var counts = d3.select(".counts");
        //.attr("width",width-wordWidth-600)
        //.attr("height",height+700);

    var squares = d3.select(".word")
        .attr("width",wordWidth+600)
        .attr("height",height+350)
        .selectAll("g")
        .data(sim)
        .enter().append("g")
        .attr("transform", function (d, i) {
            var offset =  (i*rectWidth)%wordWidth;
            return "translate(" + offset + ","+ Math.floor((i*rectWidth)/wordWidth) *rectWidth*2 +")";
        });

        squares.append("rect")
        .attr("class","square")
        .attr("width",rectWidth)
        .attr("height",rectWidth)
        .attr("x",function(d,i){ return (i*rectWidth)%wordWidth})
        .attr("y", function(d,i){ return rectWidth})
        .style("fill",function(d){
            var c = d.values[0]['1'];
            return color(+c);
        })
            .text(function(d) { return d.key; })
        .on("click",function(d){
            var k = d3.select(this).text();
            d3.select(".word")
                .selectAll(".square")
                .style("fill",function(d){
                    var c = d.values[0][k];
                    return color(c);
                })
        })
        .on("mouseover",function(d,i){
            var k = d3.select(this).text();
            var row = usersCount[i].values[0];
            var keys = []
            var values = []
            for (var i in row){
                row[i]= +row[i]
                if(row[i] >= 3) {
                    values.push(row[i]);
                    keys.push(i);
                }
            }
            counts.selectAll("div").remove();
            counts.selectAll("div")
                .data(keys.slice(1,20))
                .enter().append("div")
                .append("label")
                .attr("class","text")
                .text(function(d){return d;});
            d3.select("#uid2").style("visibility","visible").attr("value",k);
        })
        .on("mouseout",function(d){
            d3.select("#uid2").style("visibility","hidden");
            counts.selectAll("div").remove();
        });

    squares.append("text")
        .attr("class","squareBoundary")
        .attr("dx", function (d,i) {
            return (i*rectWidth)%wordWidth+20;
        })
        .attr("dy", function(d,i) { return rectWidth+55; })
        .style("text-anchor","middle")
        .style("fill","black")
        .text(function(d) { return d.key; });
}

function type(d) {
    d.timestamp = +d.timestamp; // coerce to number
    return d;
}
function type2(d) {
    // coerce to number
    return d;
}
function type3(d) {
    d.count = +d.count; // coerce to number
    return d;
}
function type4(d) {
   // d = +d; // coerce to number
    return d;
}
