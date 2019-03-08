(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
module.exports={
  "wheelCount": 2,
  "wheelMinRadius": 0.2,
  "wheelRadiusRange": 0.5,
  "wheelMinDensity": 40,
  "wheelDensityRange": 100,
  "chassisDensityRange": 300,
  "chassisMinDensity": 30,
  "chassisMinAxis": 0.1,
  "chassisAxisRange": 1.1
}

},{}],3:[function(require,module,exports){
var carConstants = require("./car-constants.json");

module.exports = {
  worldDef: worldDef,
  carConstants: getCarConstants,
  generateSchema: generateSchema
}

function worldDef(){
  var box2dfps = 60;
  return {
    gravity: { y: 0 },
    doSleep: true,
    floorseed: "abc",
    maxFloorTiles: 200,
    mutable_floor: false,
    motorSpeed: 20,
    box2dfps: box2dfps,
    max_car_health: box2dfps * 10,
    tileDimensions: {
      width: 1.5,
      height: 0.15
    }
  };
}

function getCarConstants(){
  return carConstants;
}

function generateSchema(values){
  return {
    wheel_radius: {
      type: "float",
      length: values.wheelCount,
      min: values.wheelMinRadius,
      range: values.wheelRadiusRange,
      factor: 1,
    },
    wheel_density: {
      type: "float",
      length: values.wheelCount,
      min: values.wheelMinDensity,
      range: values.wheelDensityRange,
      factor: 1,
    },
    chassis_density: {
      type: "float",
      length: 1,
      min: values.chassisDensityRange,
      range: values.chassisMinDensity,
      factor: 1,
    },
    vertex_list: {
      type: "float",
      length: 12,
      min: values.chassisMinAxis,
      range: values.chassisAxisRange,
      factor: 1,
    },
    wheel_vertex: {
      type: "shuffle",
      length: 8,
      limit: values.wheelCount,
      factor: 1,
    },
  };
}

},{"./car-constants.json":2}],4:[function(require,module,exports){
/*
  globals b2RevoluteJointDef b2Vec2 b2BodyDef b2Body b2FixtureDef b2PolygonShape b2CircleShape
*/

var createInstance = require("../machine-learning/create-instance");

module.exports = defToCar;

function defToCar(normal_def, world, constants){
  var car_def = createInstance.applyTypes(constants.schema, normal_def)
  var instance = {};
  instance.chassis = createChassis(
    world, car_def.vertex_list, car_def.chassis_density
  );
  var i;

  var wheelCount = car_def.wheel_radius.length;

  instance.wheels = [];
  for (i = 0; i < wheelCount; i++) {
    instance.wheels[i] = createWheel(
      world,
      car_def.wheel_radius[i],
      car_def.wheel_density[i]
    );
  }

  var carmass = instance.chassis.GetMass();
  for (i = 0; i < wheelCount; i++) {
    carmass += instance.wheels[i].GetMass();
  }

  var joint_def = new b2RevoluteJointDef();

  for (i = 0; i < wheelCount; i++) {
    var torque = carmass * -constants.gravity.y / car_def.wheel_radius[i];

    var randvertex = instance.chassis.vertex_list[car_def.wheel_vertex[i]];
    joint_def.localAnchorA.Set(randvertex.x, randvertex.y);
    joint_def.localAnchorB.Set(0, 0);
    joint_def.maxMotorTorque = torque;
    joint_def.motorSpeed = -constants.motorSpeed;
    joint_def.enableMotor = true;
    joint_def.bodyA = instance.chassis;
    joint_def.bodyB = instance.wheels[i];
    world.CreateJoint(joint_def);
  }

  return instance;
}

function createChassis(world, vertexs, density) {

  var vertex_list = new Array();
  vertex_list.push(new b2Vec2(vertexs[0], 0));
  vertex_list.push(new b2Vec2(vertexs[1], vertexs[2]));
  vertex_list.push(new b2Vec2(0, vertexs[3]));
  vertex_list.push(new b2Vec2(-vertexs[4], vertexs[5]));
  vertex_list.push(new b2Vec2(-vertexs[6], 0));
  vertex_list.push(new b2Vec2(-vertexs[7], -vertexs[8]));
  vertex_list.push(new b2Vec2(0, -vertexs[9]));
  vertex_list.push(new b2Vec2(vertexs[10], -vertexs[11]));

  var body_def = new b2BodyDef();
  body_def.type = b2Body.b2_dynamicBody;
  body_def.position.Set(0.0, 4.0);

  var body = world.CreateBody(body_def);

  createChassisPart(body, vertex_list[0], vertex_list[1], density);
  createChassisPart(body, vertex_list[1], vertex_list[2], density);
  createChassisPart(body, vertex_list[2], vertex_list[3], density);
  createChassisPart(body, vertex_list[3], vertex_list[4], density);
  createChassisPart(body, vertex_list[4], vertex_list[5], density);
  createChassisPart(body, vertex_list[5], vertex_list[6], density);
  createChassisPart(body, vertex_list[6], vertex_list[7], density);
  createChassisPart(body, vertex_list[7], vertex_list[0], density);

  body.vertex_list = vertex_list;

  return body;
}


function createChassisPart(body, vertex1, vertex2, density) {
  var vertex_list = new Array();
  vertex_list.push(vertex1);
  vertex_list.push(vertex2);
  vertex_list.push(b2Vec2.Make(0, 0));
  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2PolygonShape();
  fix_def.density = density;
  fix_def.friction = 10;
  fix_def.restitution = 0.2;
  fix_def.filter.groupIndex = -1;
  fix_def.shape.SetAsArray(vertex_list, 3);

  body.CreateFixture(fix_def);
}

function createWheel(world, radius, density) {
  var body_def = new b2BodyDef();
  body_def.type = b2Body.b2_dynamicBody;
  body_def.position.Set(0, 0);

  var body = world.CreateBody(body_def);

  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2CircleShape(radius);
  fix_def.density = density;
  fix_def.friction = 1;
  fix_def.restitution = 0.2;
  fix_def.filter.groupIndex = -1;

  body.CreateFixture(fix_def);
  return body;
}

},{"../machine-learning/create-instance":21}],5:[function(require,module,exports){


module.exports = {
  getInitialState: getInitialState,
  updateState: updateState,
  getStatus: getStatus,
  calculateScore: calculateScore,
};

function getInitialState(world_def){
  return {
    frames: 0,
    health: world_def.max_car_health,
    maxPositiony: 0,
    minPositiony: 0,
    maxPositionx: 0,
  };
}

function updateState(constants, worldConstruct, state){
  if(state.health <= 0){
    throw new Error("Already Dead");
  }
  if(state.maxPositionx > constants.finishLine){
    throw new Error("already Finished");
  }

  // console.log(state);
  // check health
  var position = worldConstruct.chassis.GetPosition();
  // check if car reached end of the path
  var nextState = {
    frames: state.frames + 1,
    maxPositionx: position.x > state.maxPositionx ? position.x : state.maxPositionx,
    maxPositiony: position.y > state.maxPositiony ? position.y : state.maxPositiony,
    minPositiony: position.y < state.minPositiony ? position.y : state.minPositiony
  };

  if (position.x > constants.finishLine) {
    return nextState;
  }

  if (position.x > state.maxPositionx + 0.02) {
    nextState.health = constants.max_car_health;
    return nextState;
  }
  nextState.health = state.health - 1;
  if (Math.abs(worldConstruct.chassis.GetLinearVelocity().x) < 0.001) {
    nextState.health -= 5;
  }
  return nextState;
}

function getStatus(state, constants){
  if(hasFailed(state, constants)) return -1;
  if(hasSuccess(state, constants)) return 1;
  return 0;
}

function hasFailed(state /*, constants */){
  return state.health <= 0;
}
function hasSuccess(state, constants){
  return state.maxPositionx > constants.finishLine;
}

function calculateScore(state, constants){
  var avgspeed = (state.maxPositionx / state.frames) * constants.box2dfps;
  var position = state.maxPositionx;
  var score = position + avgspeed;
  return {
    v: score,
    s: avgspeed,
    x: position,
    y: state.maxPositiony,
    y2: state.minPositiony
  }
}

},{}],6:[function(require,module,exports){
/* globals document */

var run = require("../car-schema/run");

/* ========================================================================= */
/* === Car ================================================================= */
var cw_Car = function () {
  this.__constructor.apply(this, arguments);
}

cw_Car.prototype.__constructor = function (car) {
  this.car = car;
  this.car_def = car.def;
  var car_def = this.car_def;

  this.frames = 0;
  this.alive = true;
  this.is_elite = car.def.is_elite;
  this.healthBar = document.getElementById("health" + car_def.index).style;
  this.healthBarText = document.getElementById("health" + car_def.index).nextSibling.nextSibling;
  this.healthBarText.innerHTML = car_def.index;
  this.minimapmarker = document.getElementById("bar" + car_def.index);

  if (this.is_elite) {
    this.healthBar.backgroundColor = "#3F72AF";
    this.minimapmarker.style.borderLeft = "1px solid #3F72AF";
    this.minimapmarker.innerHTML = car_def.index;
  } else {
    this.healthBar.backgroundColor = "#F7C873";
    this.minimapmarker.style.borderLeft = "1px solid #F7C873";
    this.minimapmarker.innerHTML = car_def.index;
  }

}

cw_Car.prototype.getPosition = function () {
  return this.car.car.chassis.GetPosition();
}

cw_Car.prototype.kill = function (currentRunner, constants) {
  this.minimapmarker.style.borderLeft = "1px solid #3F72AF";
  var finishLine = currentRunner.scene.finishLine
  var max_car_health = constants.max_car_health;
  var status = run.getStatus(this.car.state, {
    finishLine: finishLine,
    max_car_health: max_car_health,
  })
  switch(status){
    case 1: {
      this.healthBar.width = "0";
      break
    }
    case -1: {
      this.healthBarText.innerHTML = "&dagger;";
      this.healthBar.width = "0";
      break
    }
  }
  this.alive = false;

}

module.exports = cw_Car;

},{"../car-schema/run":5}],7:[function(require,module,exports){

var cw_drawVirtualPoly = require("./draw-virtual-poly");
var cw_drawCircle = require("./draw-circle");

module.exports = function(car_constants, myCar, camera, ctx){
  var camera_x = camera.pos.x;
  var zoom = camera.zoom;

  var wheelMinDensity = car_constants.wheelMinDensity
  var wheelDensityRange = car_constants.wheelDensityRange

  if (!myCar.alive) {
    return;
  }
  var myCarPos = myCar.getPosition();

  if (myCarPos.x < (camera_x - 5)) {
    // too far behind, don't draw
    return;
  }

  ctx.strokeStyle = "#444";
  ctx.lineWidth = 1 / zoom;

  var wheels = myCar.car.car.wheels;

  for (var i = 0; i < wheels.length; i++) {
    var b = wheels[i];
    for (var f = b.GetFixtureList(); f; f = f.m_next) {
      var s = f.GetShape();
      var color = Math.round(255 - (255 * (f.m_density - wheelMinDensity)) / wheelDensityRange).toString();
      var rgbcolor = "rgb(" + color + "," + color + "," + color + ")";
      cw_drawCircle(ctx, b, s.m_p, s.m_radius, b.m_sweep.a, rgbcolor);
    }
  }

  if (myCar.is_elite) {
    ctx.strokeStyle = "#3F72AF";
    ctx.fillStyle = "#DBE2EF";
  } else {
    ctx.strokeStyle = "#F7C873";
    ctx.fillStyle = "#FAEBCD";
  }
  ctx.beginPath();

  var chassis = myCar.car.car.chassis;

  for (f = chassis.GetFixtureList(); f; f = f.m_next) {
    var cs = f.GetShape();
    cw_drawVirtualPoly(ctx, chassis, cs.m_vertices, cs.m_vertexCount);
  }
  ctx.fill();
  ctx.stroke();
}

},{"./draw-circle":8,"./draw-virtual-poly":10}],8:[function(require,module,exports){

module.exports = cw_drawCircle;

function cw_drawCircle(ctx, body, center, radius, angle, color) {
  var p = body.GetWorldPoint(center);
  ctx.fillStyle = color;

  ctx.beginPath();
  ctx.arc(p.x, p.y, radius, 0, 2 * Math.PI, true);

  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + radius * Math.cos(angle), p.y + radius * Math.sin(angle));

  ctx.fill();
  ctx.stroke();
}

},{}],9:[function(require,module,exports){
var cw_drawVirtualPoly = require("./draw-virtual-poly");
module.exports = function(ctx, camera, cw_floorTiles) {
  var camera_x = camera.pos.x;
  var zoom = camera.zoom;
  ctx.strokeStyle = "#000";
  ctx.fillStyle = "#777";
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();

  var k;
  if(camera.pos.x - 10 > 0){
    k = Math.floor((camera.pos.x - 10) / 1.5);
  } else {
    k = 0;
  }

  // console.log(k);

  outer_loop:
    for (k; k < cw_floorTiles.length; k++) {
      var b = cw_floorTiles[k];
      for (var f = b.GetFixtureList(); f; f = f.m_next) {
        var s = f.GetShape();
        var shapePosition = b.GetWorldPoint(s.m_vertices[0]).x;
        if ((shapePosition > (camera_x - 5)) && (shapePosition < (camera_x + 10))) {
          cw_drawVirtualPoly(ctx, b, s.m_vertices, s.m_vertexCount);
        }
        if (shapePosition > camera_x + 10) {
          break outer_loop;
        }
      }
    }
  ctx.fill();
  ctx.stroke();
}

},{"./draw-virtual-poly":10}],10:[function(require,module,exports){


module.exports = function(ctx, body, vtx, n_vtx) {
  // set strokestyle and fillstyle before call
  // call beginPath before call

  var p0 = body.GetWorldPoint(vtx[0]);
  ctx.moveTo(p0.x, p0.y);
  for (var i = 1; i < n_vtx; i++) {
    var p = body.GetWorldPoint(vtx[i]);
    ctx.lineTo(p.x, p.y);
  }
  ctx.lineTo(p0.x, p0.y);
}

},{}],11:[function(require,module,exports){
var scatterPlot = require("./scatter-plot");

module.exports = {
  plotGraphs: function(graphElem, topScoresElem, scatterPlotElem, lastState, scores, config) {
    lastState = lastState || {};
    var generationSize = scores.length
    var graphcanvas = graphElem;
    var graphctx = graphcanvas.getContext("2d");
    var graphwidth = 400;
    var graphheight = 250;
    var nextState = cw_storeGraphScores(
      lastState, scores, generationSize
    );
    console.log(scores, nextState);
    cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight);
    cw_plotAverage(nextState, graphctx);
    cw_plotElite(nextState, graphctx);
    cw_plotTop(nextState, graphctx);
    cw_listTopScores(topScoresElem, nextState);
    nextState.scatterGraph = drawAllResults(
      scatterPlotElem, config, nextState, lastState.scatterGraph
    );
    return nextState;
  },
  clearGraphics: function(graphElem) {
    var graphcanvas = graphElem;
    var graphctx = graphcanvas.getContext("2d");
    var graphwidth = 400;
    var graphheight = 250;
    cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight);
  }
};


function cw_storeGraphScores(lastState, cw_carScores, generationSize) {
  console.log(cw_carScores);
  return {
    cw_topScores: (lastState.cw_topScores || [])
    .concat([cw_carScores[0].score]),
    cw_graphAverage: (lastState.cw_graphAverage || []).concat([
      cw_average(cw_carScores, generationSize)
    ]),
    cw_graphElite: (lastState.cw_graphElite || []).concat([
      cw_eliteaverage(cw_carScores, generationSize)
    ]),
    cw_graphTop: (lastState.cw_graphTop || []).concat([
      cw_carScores[0].score.v
    ]),
    allResults: (lastState.allResults || []).concat(cw_carScores),
  }
}

function cw_plotTop(state, graphctx) {
  var cw_graphTop = state.cw_graphTop;
  var graphsize = cw_graphTop.length;
  graphctx.strokeStyle = "#C83B3B";
  graphctx.beginPath();
  graphctx.moveTo(0, 0);
  for (var k = 0; k < graphsize; k++) {
    graphctx.lineTo(400 * (k + 1) / graphsize, cw_graphTop[k]);
  }
  graphctx.stroke();
}

function cw_plotElite(state, graphctx) {
  var cw_graphElite = state.cw_graphElite;
  var graphsize = cw_graphElite.length;
  graphctx.strokeStyle = "#7BC74D";
  graphctx.beginPath();
  graphctx.moveTo(0, 0);
  for (var k = 0; k < graphsize; k++) {
    graphctx.lineTo(400 * (k + 1) / graphsize, cw_graphElite[k]);
  }
  graphctx.stroke();
}

function cw_plotAverage(state, graphctx) {
  var cw_graphAverage = state.cw_graphAverage;
  var graphsize = cw_graphAverage.length;
  graphctx.strokeStyle = "#3F72AF";
  graphctx.beginPath();
  graphctx.moveTo(0, 0);
  for (var k = 0; k < graphsize; k++) {
    graphctx.lineTo(400 * (k + 1) / graphsize, cw_graphAverage[k]);
  }
  graphctx.stroke();
}


function cw_eliteaverage(scores, generationSize) {
  var sum = 0;
  for (var k = 0; k < Math.floor(generationSize / 2); k++) {
    sum += scores[k].score.v;
  }
  return sum / Math.floor(generationSize / 2);
}

function cw_average(scores, generationSize) {
  var sum = 0;
  for (var k = 0; k < generationSize; k++) {
    sum += scores[k].score.v;
  }
  return sum / generationSize;
}

function cw_clearGraphics(graphcanvas, graphctx, graphwidth, graphheight) {
  graphcanvas.width = graphcanvas.width;
  graphctx.translate(0, graphheight);
  graphctx.scale(1, -1);
  graphctx.lineWidth = 1;
  graphctx.strokeStyle = "#3F72AF";
  graphctx.beginPath();
  graphctx.moveTo(0, graphheight / 2);
  graphctx.lineTo(graphwidth, graphheight / 2);
  graphctx.moveTo(0, graphheight / 4);
  graphctx.lineTo(graphwidth, graphheight / 4);
  graphctx.moveTo(0, graphheight * 3 / 4);
  graphctx.lineTo(graphwidth, graphheight * 3 / 4);
  graphctx.stroke();
}

function cw_listTopScores(elem, state) {
  var cw_topScores = state.cw_topScores;
  var ts = elem;
  ts.innerHTML = "<b>Top Scores:</b><br />";
  cw_topScores.sort(function (a, b) {
    if (a.v > b.v) {
      return -1
    } else {
      return 1
    }
  });

  for (var k = 0; k < Math.min(10, cw_topScores.length); k++) {
    var topScore = cw_topScores[k];
    // console.log(topScore);
    var n = "#" + (k + 1) + ":";
    var score = Math.round(topScore.v * 100) / 100;
    var distance = "d:" + Math.round(topScore.x * 100) / 100;
    var yrange =  "h:" + Math.round(topScore.y2 * 100) / 100 + "/" + Math.round(topScore.y * 100) / 100 + "m";
    var gen = "(Gen " + cw_topScores[k].i + ")"

    ts.innerHTML +=  [n, score, distance, yrange, gen].join(" ") + "<br />";
  }
}

function drawAllResults(scatterPlotElem, config, allResults, previousGraph){
  if(!scatterPlotElem) return;
  return scatterPlot(scatterPlotElem, allResults, config.propertyMap, previousGraph)
}

},{"./scatter-plot":12}],12:[function(require,module,exports){
/* globals vis Highcharts */

// Called when the Visualization API is loaded.

module.exports = highCharts;
function highCharts(elem, scores){
  var keys = Object.keys(scores[0].def);
  keys = keys.reduce(function(curArray, key){
    var l = scores[0].def[key].length;
    var subArray = [];
    for(var i = 0; i < l; i++){
      subArray.push(key + "." + i);
    }
    return curArray.concat(subArray);
  }, []);
  function retrieveValue(obj, path){
    return path.split(".").reduce(function(curValue, key){
      return curValue[key];
    }, obj);
  }

  var dataObj = Object.keys(scores).reduce(function(kv, score){
    keys.forEach(function(key){
      kv[key].data.push([
        retrieveValue(score.def, key), score.score.v
      ])
    })
    return kv;
  }, keys.reduce(function(kv, key){
    kv[key] = {
      name: key,
      data: [],
    }
    return kv;
  }, {}))
  Highcharts.chart(elem.id, {
      chart: {
          type: 'scatter',
          zoomType: 'xy'
      },
      title: {
          text: 'Property Value to Score'
      },
      xAxis: {
          title: {
              enabled: true,
              text: 'Normalized'
          },
          startOnTick: true,
          endOnTick: true,
          showLastLabel: true
      },
      yAxis: {
          title: {
              text: 'Score'
          }
      },
      legend: {
          layout: 'vertical',
          align: 'left',
          verticalAlign: 'top',
          x: 100,
          y: 70,
          floating: true,
          backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF',
          borderWidth: 1
      },
      plotOptions: {
          scatter: {
              marker: {
                  radius: 5,
                  states: {
                      hover: {
                          enabled: true,
                          lineColor: 'rgb(100,100,100)'
                      }
                  }
              },
              states: {
                  hover: {
                      marker: {
                          enabled: false
                      }
                  }
              },
              tooltip: {
                  headerFormat: '<b>{series.name}</b><br>',
                  pointFormat: '{point.x}, {point.y}'
              }
          }
      },
      series: keys.map(function(key){
        return dataObj[key];
      })
  });
}

function visChart(elem, scores, propertyMap, graph) {

  // Create and populate a data table.
  var data = new vis.DataSet();
  scores.forEach(function(scoreInfo){
    data.add({
      x: getProperty(scoreInfo, propertyMap.x),
      y: getProperty(scoreInfo, propertyMap.x),
      z: getProperty(scoreInfo, propertyMap.z),
      style: getProperty(scoreInfo, propertyMap.z),
      // extra: def.ancestry
    });
  });

  function getProperty(info, key){
    if(key === "score"){
      return info.score.v
    } else {
      return info.def[key];
    }
  }

  // specify options
  var options = {
    width:  '600px',
    height: '600px',
    style: 'dot-size',
    showPerspective: true,
    showLegend: true,
    showGrid: true,
    showShadow: false,

    // Option tooltip can be true, false, or a function returning a string with HTML contents
    tooltip: function (point) {
      // parameter point contains properties x, y, z, and data
      // data is the original object passed to the point constructor
      return 'score: <b>' + point.z + '</b><br>'; // + point.data.extra;
    },

    // Tooltip default styling can be overridden
    tooltipStyle: {
      content: {
        background    : 'rgba(255, 255, 255, 0.7)',
        padding       : '10px',
        borderRadius  : '10px'
      },
      line: {
        borderLeft    : '1px dotted rgba(0, 0, 0, 0.5)'
      },
      dot: {
        border        : '5px solid rgba(0, 0, 0, 0.5)'
      }
    },

    keepAspectRatio: true,
    verticalRatio: 0.5
  };

  var camera = graph ? graph.getCameraPosition() : null;

  // create our graph
  var container = elem;
  graph = new vis.Graph3d(container, data, options);

  if (camera) graph.setCameraPosition(camera); // restore camera position
  return graph;
}

},{}],13:[function(require,module,exports){

module.exports = generateRandom;
function generateRandom(){
  return Math.random();
}

},{}],14:[function(require,module,exports){
// http://sunmingtao.blogspot.com/2016/11/inbreeding-coefficient.html
module.exports = getInbreedingCoefficient;

function getInbreedingCoefficient(child){
  var nameIndex = new Map();
  var flagged = new Set();
  var convergencePoints = new Set();
  createAncestryMap(child, []);

  var storedCoefficients = new Map();

  return Array.from(convergencePoints.values()).reduce(function(sum, point){
    var iCo = getCoefficient(point);
    return sum + iCo;
  }, 0);

  function createAncestryMap(initNode){
    var itemsInQueue = [{ node: initNode, path: [] }];
    do{
      var item = itemsInQueue.shift();
      var node = item.node;
      var path = item.path;
      if(processItem(node, path)){
        var nextPath = [ node.id ].concat(path);
        itemsInQueue = itemsInQueue.concat(node.ancestry.map(function(parent){
          return {
            node: parent,
            path: nextPath
          };
        }));
      }
    }while(itemsInQueue.length);


    function processItem(node, path){
      var newAncestor = !nameIndex.has(node.id);
      if(newAncestor){
        nameIndex.set(node.id, {
          parents: (node.ancestry || []).map(function(parent){
            return parent.id;
          }),
          id: node.id,
          children: [],
          convergences: [],
        });
      } else {

        flagged.add(node.id)
        nameIndex.get(node.id).children.forEach(function(childIdentifier){
          var offsets = findConvergence(childIdentifier.path, path);
          if(!offsets){
            return;
          }
          var childID = path[offsets[1]];
          convergencePoints.add(childID);
          nameIndex.get(childID).convergences.push({
            parent: node.id,
            offsets: offsets,
          });
        });
      }

      if(path.length){
        nameIndex.get(node.id).children.push({
          child: path[0],
          path: path
        });
      }

      if(!newAncestor){
        return;
      }
      if(!node.ancestry){
        return;
      }
      return true;
    }
  }

  function getCoefficient(id){
    if(storedCoefficients.has(id)){
      return storedCoefficients.get(id);
    }
    var node = nameIndex.get(id);
    var val = node.convergences.reduce(function(sum, point){
      return sum + Math.pow(1 / 2, point.offsets.reduce(function(sum, value){
        return sum + value;
      }, 1)) * (1 + getCoefficient(point.parent));
    }, 0);
    storedCoefficients.set(id, val);

    return val;

  }
  function findConvergence(listA, listB){
    var ci, cj, li, lj;
    outerloop:
    for(ci = 0, li = listA.length; ci < li; ci++){
      for(cj = 0, lj = listB.length; cj < lj; cj++){
        if(listA[ci] === listB[cj]){
          break outerloop;
        }
      }
    }
    if(ci === li){
      return false;
    }
    return [ci, cj];
  }
}

},{}],15:[function(require,module,exports){
var carConstruct = require("../car-schema/construct.js");

var carConstants = carConstruct.carConstants();

var schema = carConstruct.generateSchema(carConstants);
var pickParent = require("./pickParent");
var selectFromAllParents = require("./selectFromAllParents");
const constants = {
  generationSize: 20,
  schema: schema,
  championLength: 1,
  mutation_range: 1,
  gen_mutation: 0.05,
};
module.exports = function(){
  var currentChoices = new Map();
  return Object.assign(
    {},
    constants,
    {
      selectFromAllParents: selectFromAllParents,
      generateRandom: require("./generateRandom"),
      pickParent: pickParent.bind(void 0, currentChoices),
    }
  );
}
module.exports.constants = constants

},{"../car-schema/construct.js":3,"./generateRandom":13,"./pickParent":16,"./selectFromAllParents":17}],16:[function(require,module,exports){
var nAttributes = 15;
module.exports = pickParent;

function pickParent(currentChoices, chooseId, key /* , parents */){
  if(!currentChoices.has(chooseId)){
    currentChoices.set(chooseId, initializePick())
  }
  // console.log(chooseId);
  var state = currentChoices.get(chooseId);
  // console.log(state.curparent);
  state.i++
  if(["wheel_radius", "wheel_vertex", "wheel_density"].indexOf(key) > -1){
    state.curparent = cw_chooseParent(state);
    return state.curparent;
  }
  state.curparent = cw_chooseParent(state);
  return state.curparent;

  function cw_chooseParent(state) {
    var curparent = state.curparent;
    var attributeIndex = state.i;
    var swapPoint1 = state.swapPoint1
    var swapPoint2 = state.swapPoint2
    // console.log(swapPoint1, swapPoint2, attributeIndex)
    if ((swapPoint1 == attributeIndex) || (swapPoint2 == attributeIndex)) {
      return curparent == 1 ? 0 : 1
    }
    return curparent
  }

  function initializePick(){
    var curparent = 0;

    var swapPoint1 = Math.floor(Math.random() * (nAttributes));
    var swapPoint2 = swapPoint1;
    while (swapPoint2 == swapPoint1) {
      swapPoint2 = Math.floor(Math.random() * (nAttributes));
    }
    var i = 0;
    return {
      curparent: curparent,
      i: i,
      swapPoint1: swapPoint1,
      swapPoint2: swapPoint2
    }
  }
}

},{}],17:[function(require,module,exports){
var getInbreedingCoefficient = require("./inbreeding-coefficient");

module.exports = simpleSelect;

function simpleSelect(parents){
  var totalParents = parents.length
  var r = Math.random();
  if (r == 0)
    return 0;
  return Math.floor(-Math.log(r) * totalParents) % totalParents;
}

function selectFromAllParents(parents, parentList, previousParentIndex) {
  var previousParent = parents[previousParentIndex];
  var validParents = parents.filter(function(parent, i){
    if(previousParentIndex === i){
      return false;
    }
    if(!previousParent){
      return true;
    }
    var child = {
      id: Math.random().toString(32),
      ancestry: [previousParent, parent].map(function(p){
        return {
          id: p.def.id,
          ancestry: p.def.ancestry
        }
      })
    }
    var iCo = getInbreedingCoefficient(child);
    console.log("inbreeding coefficient", iCo)
    if(iCo > 0.25){
      return false;
    }
    return true;
  })
  if(validParents.length === 0){
    return Math.floor(Math.random() * parents.length)
  }
  var totalScore = validParents.reduce(function(sum, parent){
    return sum + parent.score.v;
  }, 0);
  var r = totalScore * Math.random();
  for(var i = 0; i < validParents.length; i++){
    var score = validParents[i].score.v;
    if(r > score){
      r = r - score;
    } else {
      break;
    }
  }
  return i;
}

},{"./inbreeding-coefficient":14}],18:[function(require,module,exports){

module.exports = function(car) {
  var out = {
    chassis: ghost_get_chassis(car.chassis),
    wheels: [],
    pos: {x: car.chassis.GetPosition().x, y: car.chassis.GetPosition().y}
  };

  for (var i = 0; i < car.wheels.length; i++) {
    out.wheels[i] = ghost_get_wheel(car.wheels[i]);
  }

  return out;
}

function ghost_get_chassis(c) {
  var gc = [];

  for (var f = c.GetFixtureList(); f; f = f.m_next) {
    var s = f.GetShape();

    var p = {
      vtx: [],
      num: 0
    }

    p.num = s.m_vertexCount;

    for (var i = 0; i < s.m_vertexCount; i++) {
      p.vtx.push(c.GetWorldPoint(s.m_vertices[i]));
    }

    gc.push(p);
  }

  return gc;
}

function ghost_get_wheel(w) {
  var gw = [];

  for (var f = w.GetFixtureList(); f; f = f.m_next) {
    var s = f.GetShape();

    var c = {
      pos: w.GetWorldPoint(s.m_p),
      rad: s.m_radius,
      ang: w.m_sweep.a
    }

    gw.push(c);
  }

  return gw;
}

},{}],19:[function(require,module,exports){

var ghost_get_frame = require("./car-to-ghost.js");

var enable_ghost = true;

module.exports = {
  ghost_create_replay: ghost_create_replay,
  ghost_create_ghost: ghost_create_ghost,
  ghost_pause: ghost_pause,
  ghost_resume: ghost_resume,
  ghost_get_position: ghost_get_position,
  ghost_compare_to_replay: ghost_compare_to_replay,
  ghost_move_frame: ghost_move_frame,
  ghost_add_replay_frame: ghost_add_replay_frame,
  ghost_draw_frame: ghost_draw_frame,
  ghost_reset_ghost: ghost_reset_ghost
}

function ghost_create_replay() {
  if (!enable_ghost)
    return null;

  return {
    num_frames: 0,
    frames: [],
  }
}

function ghost_create_ghost() {
  if (!enable_ghost)
    return null;

  return {
    replay: null,
    frame: 0,
    dist: -100
  }
}

function ghost_reset_ghost(ghost) {
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  ghost.frame = 0;
}

function ghost_pause(ghost) {
  if (ghost != null)
    ghost.old_frame = ghost.frame;
  ghost_reset_ghost(ghost);
}

function ghost_resume(ghost) {
  if (ghost != null)
    ghost.frame = ghost.old_frame;
}

function ghost_get_position(ghost) {
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  if (ghost.frame < 0)
    return;
  if (ghost.replay == null)
    return;
  var frame = ghost.replay.frames[ghost.frame];
  return frame.pos;
}

function ghost_compare_to_replay(replay, ghost, max) {
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  if (replay == null)
    return;

  if (ghost.dist < max) {
    ghost.replay = replay;
    ghost.dist = max;
    ghost.frame = 0;
  }
}

function ghost_move_frame(ghost) {
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  if (ghost.replay == null)
    return;
  ghost.frame++;
  if (ghost.frame >= ghost.replay.num_frames)
    ghost.frame = ghost.replay.num_frames - 1;
}

function ghost_add_replay_frame(replay, car) {
  if (!enable_ghost)
    return;
  if (replay == null)
    return;

  var frame = ghost_get_frame(car);
  replay.frames.push(frame);
  replay.num_frames++;
}

function ghost_draw_frame(ctx, ghost, camera) {
  var zoom = camera.zoom;
  if (!enable_ghost)
    return;
  if (ghost == null)
    return;
  if (ghost.frame < 0)
    return;
  if (ghost.replay == null)
    return;

  var frame = ghost.replay.frames[ghost.frame];

  // wheel style
  ctx.fillStyle = "#eee";
  ctx.strokeStyle = "#aaa";
  ctx.lineWidth = 1 / zoom;

  for (var i = 0; i < frame.wheels.length; i++) {
    for (var w in frame.wheels[i]) {
      ghost_draw_circle(ctx, frame.wheels[i][w].pos, frame.wheels[i][w].rad, frame.wheels[i][w].ang);
    }
  }

  // chassis style
  ctx.strokeStyle = "#aaa";
  ctx.fillStyle = "#eee";
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();
  for (var c in frame.chassis)
    ghost_draw_poly(ctx, frame.chassis[c].vtx, frame.chassis[c].num);
  ctx.fill();
  ctx.stroke();
}

function ghost_draw_poly(ctx, vtx, n_vtx) {
  ctx.moveTo(vtx[0].x, vtx[0].y);
  for (var i = 1; i < n_vtx; i++) {
    ctx.lineTo(vtx[i].x, vtx[i].y);
  }
  ctx.lineTo(vtx[0].x, vtx[0].y);
}

function ghost_draw_circle(ctx, center, radius, angle) {
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI, true);

  ctx.moveTo(center.x, center.y);
  ctx.lineTo(center.x + radius * Math.cos(angle), center.y + radius * Math.sin(angle));

  ctx.fill();
  ctx.stroke();
}

},{"./car-to-ghost.js":18}],20:[function(require,module,exports){
/* globals document performance localStorage alert confirm btoa HTMLDivElement */
/* globals b2Vec2 */
// Global Vars

var worldRun = require("./world/run.js");
var carConstruct = require("./car-schema/construct.js");

var manageRound = require("./machine-learning/genetic-algorithm/manage-round.js");

var ghost_fns = require("./ghost/index.js");

var drawCar = require("./draw/draw-car.js");
var graph_fns = require("./draw/plot-graphs.js");
var plot_graphs = graph_fns.plotGraphs;
var cw_clearGraphics = graph_fns.clearGraphics;
var cw_drawFloor = require("./draw/draw-floor.js");

var ghost_draw_frame = ghost_fns.ghost_draw_frame;
var ghost_create_ghost = ghost_fns.ghost_create_ghost;
var ghost_add_replay_frame = ghost_fns.ghost_add_replay_frame;
var ghost_compare_to_replay = ghost_fns.ghost_compare_to_replay;
var ghost_get_position = ghost_fns.ghost_get_position;
var ghost_move_frame = ghost_fns.ghost_move_frame;
var ghost_reset_ghost = ghost_fns.ghost_reset_ghost
var ghost_pause = ghost_fns.ghost_pause;
var ghost_resume = ghost_fns.ghost_resume;
var ghost_create_replay = ghost_fns.ghost_create_replay;

var cw_Car = require("./draw/draw-car-stats.js");
var ghost;
var carMap = new Map();

var doDraw = true;
var cw_paused = false;

var box2dfps = 60;
var screenfps = 60;
var skipTicks = Math.round(1000 / box2dfps);
var maxFrameSkip = skipTicks * 2;

var canvas = document.getElementById("mainbox");
var ctx = canvas.getContext("2d");

var camera = {
  speed: 0.05,
  pos: {
    x: 0, y: 0
  },
  target: -1,
  zoom: 70
}

var minimapcamera = document.getElementById("minimapcamera").style;
var minimapholder = document.querySelector("#minimapholder");

var minimapcanvas = document.getElementById("minimap");
var minimapctx = minimapcanvas.getContext("2d");
var minimapscale = 3;
var minimapfogdistance = 0;
var fogdistance = document.getElementById("minimapfog").style;


var carConstants = carConstruct.carConstants();


var max_car_health = box2dfps * 10;

var cw_ghostReplayInterval = null;

var distanceMeter = document.getElementById("distancemeter");
var heightMeter = document.getElementById("heightmeter");

var leaderPosition = {
  x: 0, y: 0
}

minimapcamera.width = 12 * minimapscale + "px";
minimapcamera.height = 6 * minimapscale + "px";


// ======= WORLD STATE ======
var generationConfig = require("./generation-config");


var world_def = {
  gravity: new b2Vec2(0.0, -9.81),
  doSleep: true,
  floorseed: btoa(Math.seedrandom()),
  tileDimensions: new b2Vec2(1.5, 0.15),
  maxFloorTiles: 200,
  mutable_floor: false,
  box2dfps: box2dfps,
  motorSpeed: 20,
  max_car_health: max_car_health,
  schema: generationConfig.constants.schema
}

var cw_deadCars;

var arrOfGraphStates = [];

var graphState = {
  cw_topScores: [],
  cw_graphAverage: [],
  cw_graphElite: [],
  cw_graphTop: [],
};

function resetGraphState(){
  graphState = {
    cw_topScores: [],
    cw_graphAverage: [],
    cw_graphElite: [],
    cw_graphTop: [],
  };
}



// ==========================

var generationState;

// ======== Activity State ====
var currentRunner;
var loops = 0;
var nextGameTick = (new Date).getTime();

function showDistance(distance, height) {
  distanceMeter.innerHTML = distance + " meters<br />";
  heightMeter.innerHTML = height + " meters";
  if (distance > minimapfogdistance) {
    fogdistance.width = 800 - Math.round(distance + 15) * minimapscale + "px";
    minimapfogdistance = distance;
  }
}



/* === END Car ============================================================= */
/* ========================================================================= */


/* ========================================================================= */
/* ==== Generation ========================================================= */

function cw_generationZero() {

  generationState = manageRound.generationZero(generationConfig());
}

function resetCarUI(){
  cw_deadCars = 0;
  leaderPosition = {
    x: 0, y: 0
  };
  document.getElementById("generation").innerHTML = generationState.counter.toString();
  document.getElementById("cars").innerHTML = "";
  document.getElementById("population").innerHTML = generationConfig.constants.generationSize.toString();
}

/* ==== END Genration ====================================================== */
/* ========================================================================= */

/* ========================================================================= */
/* ==== Drawing ============================================================ */

function cw_drawScreen() {
  var floorTiles = currentRunner.scene.floorTiles;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  cw_setCameraPosition();
  var camera_x = camera.pos.x;
  var camera_y = camera.pos.y;
  var zoom = camera.zoom;
  ctx.translate(200 - (camera_x * zoom), 200 + (camera_y * zoom));
  ctx.scale(zoom, -zoom);
  cw_drawFloor(ctx, camera, floorTiles);
  ghost_draw_frame(ctx, ghost, camera);
  cw_drawCars();
  ctx.restore();
}

function cw_minimapCamera(/* x, y*/) {
  var camera_x = camera.pos.x
  var camera_y = camera.pos.y
  minimapcamera.left = Math.round((2 + camera_x) * minimapscale) + "px";
  minimapcamera.top = Math.round((31 - camera_y) * minimapscale) + "px";
}

function cw_setCameraTarget(k) {
  camera.target = k;
}

function cw_setCameraPosition() {
  var cameraTargetPosition
  if (camera.target !== -1) {
    cameraTargetPosition = carMap.get(camera.target).getPosition();
  } else {
    cameraTargetPosition = leaderPosition;
  }
  var diff_y = camera.pos.y - cameraTargetPosition.y;
  var diff_x = camera.pos.x - cameraTargetPosition.x;
  camera.pos.y -= camera.speed * diff_y;
  camera.pos.x -= camera.speed * diff_x;
  cw_minimapCamera(camera.pos.x, camera.pos.y);
}

function cw_drawGhostReplay() {
  var floorTiles = currentRunner.scene.floorTiles;
  var carPosition = ghost_get_position(ghost);
  camera.pos.x = carPosition.x;
  camera.pos.y = carPosition.y;
  cw_minimapCamera(camera.pos.x, camera.pos.y);
  showDistance(
    Math.round(carPosition.x * 100) / 100,
    Math.round(carPosition.y * 100) / 100
  );
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(
    200 - (carPosition.x * camera.zoom),
    200 + (carPosition.y * camera.zoom)
  );
  ctx.scale(camera.zoom, -camera.zoom);
  ghost_draw_frame(ctx, ghost);
  ghost_move_frame(ghost);
  cw_drawFloor(ctx, camera, floorTiles);
  ctx.restore();
}


function cw_drawCars() {
  var cw_carArray = Array.from(carMap.values());
  for (var k = (cw_carArray.length - 1); k >= 0; k--) {
    var myCar = cw_carArray[k];
    drawCar(carConstants, myCar, camera, ctx)
  }
}

function toggleDisplay() {
  canvas.width = canvas.width;
  if (doDraw) {
    doDraw = false;
    cw_stopSimulation();
    cw_runningInterval = setInterval(function () {
      var time = performance.now() + (1000 / screenfps);
      while (time > performance.now()) {
        simulationStep();
      }
    }, 1);
  } else {
    doDraw = true;
    clearInterval(cw_runningInterval);
    cw_startSimulation();
  }
}

function cw_drawMiniMap() {
  var floorTiles = currentRunner.scene.floorTiles;
  var last_tile = null;
  var tile_position = new b2Vec2(-5, 0);
  minimapfogdistance = 0;
  fogdistance.width = "800px";
  minimapcanvas.width = minimapcanvas.width;
  minimapctx.strokeStyle = "#3F72AF";
  minimapctx.beginPath();
  minimapctx.moveTo(0, 35 * minimapscale);
  for (var k = 0; k < floorTiles.length; k++) {
    last_tile = floorTiles[k];
    var last_fixture = last_tile.GetFixtureList();
    var last_world_coords = last_tile.GetWorldPoint(last_fixture.GetShape().m_vertices[3]);
    tile_position = last_world_coords;
    minimapctx.lineTo((tile_position.x + 5) * minimapscale, (-tile_position.y + 35) * minimapscale);
  }
  minimapctx.stroke();
}

/* ==== END Drawing ======================================================== */
/* ========================================================================= */
var uiListeners = {
  preCarStep: function(){
    ghost_move_frame(ghost);
  },
  carStep(car){
    updateCarUI(car);
  },
  carDeath(carInfo){

    var k = carInfo.index;

    var car = carInfo.car, score = carInfo.score;
    carMap.get(carInfo).kill(currentRunner, world_def);

    // refocus camera to leader on death
    if (camera.target == carInfo) {
      cw_setCameraTarget(-1);
    }
    // console.log(score);
    carMap.delete(carInfo);
    ghost_compare_to_replay(car.replay, ghost, score.v);
    score.i = generationState.counter;

    cw_deadCars++;
    var generationSize = generationConfig.constants.generationSize;
    document.getElementById("population").innerHTML = (generationSize - cw_deadCars).toString();

    // console.log(leaderPosition.leader, k)
    if (leaderPosition.leader == k) {
      // leader is dead, find new leader
      cw_findLeader();
    }
  },
  generationEnd(results){
    cleanupRound(results);
    return cw_newRound(results);
  }
}

function simulationStep() {  
  currentRunner.step();
  showDistance(
    Math.round(leaderPosition.x * 100) / 100,
    Math.round(leaderPosition.y * 100) / 100
  );
}

function gameLoop() {
  /*loops = 0;
  while (!cw_paused && (new Date).getTime() > nextGameTick && loops < maxFrameSkip) {   
    nextGameTick += skipTicks;
    loops++;
  }
  simulationStep();
  cw_drawScreen();
	*/
	fastForward();//used for testing data
  if(!cw_paused) window.requestAnimationFrame(gameLoop);
}

function updateCarUI(carInfo){
  var k = carInfo.index;
  var car = carMap.get(carInfo);
  var position = car.getPosition();

  ghost_add_replay_frame(car.replay, car.car.car);
  car.minimapmarker.style.left = Math.round((position.x + 5) * minimapscale) + "px";
  car.healthBar.width = Math.round((car.car.state.health / max_car_health) * 100) + "%";
  if (position.x > leaderPosition.x) {
    leaderPosition = position;
    leaderPosition.leader = k;
    // console.log("new leader: ", k);
  }
}

function cw_findLeader() {
  var lead = 0;
  var cw_carArray = Array.from(carMap.values());
  for (var k = 0; k < cw_carArray.length; k++) {
    if (!cw_carArray[k].alive) {
      continue;
    }
    var position = cw_carArray[k].getPosition();
    if (position.x > lead) {
      leaderPosition = position;
      leaderPosition.leader = k;
    }
  }
}

function fastForward(){
  var gen = generationState.counter;
  while(gen === generationState.counter){
    currentRunner.step();
  }
}

function cleanupRound(results){

  results.sort(function (a, b) {
    if (a.score.v > b.score.v) {
      return -1
    } else {
      return 1
    }
  })
  graphState = plot_graphs(
    document.getElementById("graphcanvas"),
    document.getElementById("topscores"),
    null,
    graphState,
    results
  );
}

function cw_newRound(results) {
  camera.pos.x = camera.pos.y = 0;
  cw_setCameraTarget(-1);
  generationState =manageRound.nextGeneration(
    generationState, results, generationConfig());
	
	if(generationState.counter===0){
		var rounds = localStorage.getItem("round");
		var newRounds = generationState.round+rounds;
		localStorage.setItem("EA"+newRounds, JSON.stringify(graphState.cw_graphAverage));
		localStorage.setItem("round", newRounds);
		//graphState.cw_graphAverage = new Array();
		//resetGraphState();
		location.reload();
	}
	
	
  if (world_def.mutable_floor) {
    // GHOST DISABLED
    ghost = null;
    world_def.floorseed = btoa(Math.seedrandom());
  } else {
    // RE-ENABLE GHOST
    ghost_reset_ghost(ghost);
  }
  currentRunner = worldRun(world_def, generationState.generation, uiListeners);
  setupCarUI();
  cw_drawMiniMap();
  resetCarUI();
}

function cw_startSimulation() {
  cw_paused = false;
  window.requestAnimationFrame(gameLoop);
}

function cw_stopSimulation() {
  cw_paused = true;
}

function cw_clearPopulationWorld() {
  carMap.forEach(function(car){
    car.kill(currentRunner, world_def);
  });
}

function cw_resetPopulationUI() {
  document.getElementById("generation").innerHTML = "";
  document.getElementById("cars").innerHTML = "";
  document.getElementById("topscores").innerHTML = "";
  cw_clearGraphics(document.getElementById("graphcanvas"));
  resetGraphState();
}

function cw_resetWorld() {
  doDraw = true;
  cw_stopSimulation();
  world_def.floorseed = document.getElementById("newseed").value;
  cw_clearPopulationWorld();
  cw_resetPopulationUI();

  Math.seedrandom();
  cw_generationZero();
  currentRunner = worldRun(
    world_def, generationState.generation, uiListeners
  );

  ghost = ghost_create_ghost();
  resetCarUI();
  setupCarUI()
  cw_drawMiniMap();

  cw_startSimulation();
}

function setupCarUI(){
  currentRunner.cars.map(function(carInfo){
    var car = new cw_Car(carInfo, carMap);
    carMap.set(carInfo, car);
    car.replay = ghost_create_replay();
    ghost_add_replay_frame(car.replay, car.car.car);
  })
}


document.querySelector("#fast-forward").addEventListener("click", function(){
  fastForward()
});

document.querySelector("#save-progress").addEventListener("click", function(){
  saveProgress()
});

document.querySelector("#restore-progress").addEventListener("click", function(){
  restoreProgress()
});

document.querySelector("#toggle-display").addEventListener("click", function(){
  toggleDisplay()
})

document.querySelector("#new-population").addEventListener("click", function(){
  cw_resetPopulationUI()
  cw_generationZero();
  ghost = ghost_create_ghost();
  resetCarUI();
})

function saveProgress() {
  localStorage.cw_savedGeneration = JSON.stringify(generationState.generation);
  localStorage.cw_genCounter = generationState.counter;
  localStorage.cw_ghost = JSON.stringify(ghost);
  localStorage.cw_topScores = JSON.stringify(graphState.cw_topScores);
  localStorage.cw_floorSeed = world_def.floorseed;
}

function restoreProgress() {
  if (typeof localStorage.cw_savedGeneration == 'undefined' || localStorage.cw_savedGeneration == null) {
    alert("No saved progress found");
    return;
  }
  cw_stopSimulation();
  generationState.generation = JSON.parse(localStorage.cw_savedGeneration);
  generationState.counter = localStorage.cw_genCounter;
  ghost = JSON.parse(localStorage.cw_ghost);
  graphState.cw_topScores = JSON.parse(localStorage.cw_topScores);
  world_def.floorseed = localStorage.cw_floorSeed;
  document.getElementById("newseed").value = world_def.floorseed;

  currentRunner = worldRun(world_def, generationState.generation, uiListeners);
  cw_drawMiniMap();
  Math.seedrandom();

  resetCarUI();
  cw_startSimulation();
}

document.querySelector("#confirm-reset").addEventListener("click", function(){
  cw_confirmResetWorld()
})

function cw_confirmResetWorld() {
  if (confirm('Really reset world?')) {
    cw_resetWorld();
  } else {
    return false;
  }
}

// ghost replay stuff


function cw_pauseSimulation() {
  cw_paused = true;
  ghost_pause(ghost);
}

function cw_resumeSimulation() {
  cw_paused = false;
  ghost_resume(ghost);
  window.requestAnimationFrame(gameLoop);
}

function cw_startGhostReplay() {
  if (!doDraw) {
    toggleDisplay();
  }
  cw_pauseSimulation();
  cw_ghostReplayInterval = setInterval(cw_drawGhostReplay, Math.round(1000 / screenfps));
}

function cw_stopGhostReplay() {
  clearInterval(cw_ghostReplayInterval);
  cw_ghostReplayInterval = null;
  cw_findLeader();
  camera.pos.x = leaderPosition.x;
  camera.pos.y = leaderPosition.y;
  cw_resumeSimulation();
}

document.querySelector("#toggle-ghost").addEventListener("click", function(e){
  cw_toggleGhostReplay(e.target)
})

function cw_toggleGhostReplay(button) {
  if (cw_ghostReplayInterval == null) {
    cw_startGhostReplay();
    button.value = "Resume simulation";
  } else {
    cw_stopGhostReplay();
    button.value = "View top replay";
  }
}
// ghost replay stuff END

// initial stuff, only called once (hopefully)
function cw_init() {
  // clone silver dot and health bar
  var mmm = document.getElementsByName('minimapmarker')[0];
  var hbar = document.getElementsByName('healthbar')[0];
  var generationSize = generationConfig.constants.generationSize;

  for (var k = 0; k < generationSize; k++) {

    // minimap markers
    var newbar = mmm.cloneNode(true);
    newbar.id = "bar" + k;
    newbar.style.paddingTop = k * 9 + "px";
    minimapholder.appendChild(newbar);

    // health bars
    var newhealth = hbar.cloneNode(true);
    newhealth.getElementsByTagName("DIV")[0].id = "health" + k;
    newhealth.car_index = k;
    document.getElementById("health").appendChild(newhealth);
  }
  mmm.parentNode.removeChild(mmm);
  hbar.parentNode.removeChild(hbar);
  world_def.floorseed = btoa(Math.seedrandom());
  cw_generationZero();
  ghost = ghost_create_ghost();
  resetCarUI();
  currentRunner = worldRun(world_def, generationState.generation, uiListeners);
  setupCarUI();
  cw_drawMiniMap();
  window.requestAnimationFrame(gameLoop);
  
}

function relMouseCoords(event) {
  var totalOffsetX = 0;
  var totalOffsetY = 0;
  var canvasX = 0;
  var canvasY = 0;
  var currentElement = this;

  do {
    totalOffsetX += currentElement.offsetLeft - currentElement.scrollLeft;
    totalOffsetY += currentElement.offsetTop - currentElement.scrollTop;
    currentElement = currentElement.offsetParent
  }
  while (currentElement);

  canvasX = event.pageX - totalOffsetX;
  canvasY = event.pageY - totalOffsetY;

  return {x: canvasX, y: canvasY}
}
HTMLDivElement.prototype.relMouseCoords = relMouseCoords;
minimapholder.onclick = function (event) {
  var coords = minimapholder.relMouseCoords(event);
  var cw_carArray = Array.from(carMap.values());
  var closest = {
    value: cw_carArray[0].car,
    dist: Math.abs(((cw_carArray[0].getPosition().x + 6) * minimapscale) - coords.x),
    x: cw_carArray[0].getPosition().x
  }

  var maxX = 0;
  for (var i = 0; i < cw_carArray.length; i++) {
    var pos = cw_carArray[i].getPosition();
    var dist = Math.abs(((pos.x + 6) * minimapscale) - coords.x);
    if (dist < closest.dist) {
      closest.value = cw_carArray.car;
      closest.dist = dist;
      closest.x = pos.x;
    }
    maxX = Math.max(pos.x, maxX);
  }

  if (closest.x == maxX) { // focus on leader again
    cw_setCameraTarget(-1);
  } else {
    cw_setCameraTarget(closest.value);
  }
}


document.querySelector("#mutationrate").addEventListener("change", function(e){
  var elem = e.target
  cw_setMutation(elem.options[elem.selectedIndex].value)
})

document.querySelector("#mutationsize").addEventListener("change", function(e){
  var elem = e.target
  cw_setMutationRange(elem.options[elem.selectedIndex].value)
})

document.querySelector("#floor").addEventListener("change", function(e){
  var elem = e.target
  cw_setMutableFloor(elem.options[elem.selectedIndex].value)
});

document.querySelector("#gravity").addEventListener("change", function(e){
  var elem = e.target
  cw_setGravity(elem.options[elem.selectedIndex].value)
})

document.querySelector("#elitesize").addEventListener("change", function(e){
  var elem = e.target
  cw_setEliteSize(elem.options[elem.selectedIndex].value)
})

function cw_setMutation(mutation) {
  generationConfig.constants.gen_mutation = parseFloat(mutation);
}

function cw_setMutationRange(range) {
  generationConfig.constants.mutation_range = parseFloat(range);
}

function cw_setMutableFloor(choice) {
  world_def.mutable_floor = (choice == 1);
}

function cw_setGravity(choice) {
  world_def.gravity = new b2Vec2(0.0, -parseFloat(choice));
  var world = currentRunner.scene.world
  // CHECK GRAVITY CHANGES
  if (world.GetGravity().y != world_def.gravity.y) {
    world.SetGravity(world_def.gravity);
  }
}

function cw_setEliteSize(clones) {
  generationConfig.constants.championLength = parseInt(clones, 10);
}

cw_init();

},{"./car-schema/construct.js":3,"./draw/draw-car-stats.js":6,"./draw/draw-car.js":7,"./draw/draw-floor.js":9,"./draw/plot-graphs.js":11,"./generation-config":15,"./ghost/index.js":19,"./machine-learning/genetic-algorithm/manage-round.js":26,"./world/run.js":31}],21:[function(require,module,exports){
var random = require("./random.js");

module.exports = {
  createGenerationZero(schema, generator){
    return Object.keys(schema).reduce(function(instance, key){
      var schemaProp = schema[key];
      var values = random.createNormals(schemaProp, generator);
      instance[key] = values;
      return instance;
    }, { id: Math.random().toString(32) });
  },
  createCrossBreed(schema, parents, parentChooser){
    var id = Math.random().toString(32);
    return Object.keys(schema).reduce(function(crossDef, key){
      var schemaDef = schema[key];
      var values = [];
      for(var i = 0, l = schemaDef.length; i < l; i++){
        var p = parentChooser(id, key, parents);
        values.push(parents[p][key][i]);
      }
      crossDef[key] = values;
      return crossDef;
    }, {
      id: id,
      ancestry: parents.map(function(parent){
        return {
          id: parent.id,
          ancestry: parent.ancestry,
        };
      })
    });
  },
  createMutatedClone(schema, generator, parent, factor, chanceToMutate){
    return Object.keys(schema).reduce(function(clone, key){
      var schemaProp = schema[key];
      var originalValues = parent[key];
      var values = random.mutateNormals(
        schemaProp, generator, originalValues, factor, chanceToMutate
      );
      clone[key] = values;
      return clone;
    }, {
      id: parent.id,
      ancestry: parent.ancestry
    });
  },
  applyTypes(schema, parent){
    return Object.keys(schema).reduce(function(clone, key){
      var schemaProp = schema[key];
      var originalValues = parent[key];
      var values;
      switch(schemaProp.type){
        case "shuffle" :
          values = random.mapToShuffle(schemaProp, originalValues); break;
        case "float" :
          values = random.mapToFloat(schemaProp, originalValues); break;
        case "integer":
          values = random.mapToInteger(schemaProp, originalValues); break;
        default:
          throw new Error(`Unknown type ${schemaProp.type} of schema for key ${key}`);
      }
      clone[key] = values;
      return clone;
    }, {
      id: parent.id,
      ancestry: parent.ancestry
    });
  },
}

},{"./random.js":30}],22:[function(require,module,exports){
module.exports = {
	createDataPointCluster: createDataPointCluster,
	createDataPoint: createDataPoint,
	createClusterInterface: createClusterInterface,
	findDataPointCluster: findDataPointCluster,
	findDataPoint: findDataPoint,
	sortCluster: sortCluster,
	findOjectNeighbors: findOjectNeighbors,
	scoreObject: scoreObject,
	createSubDataPointCluster:createSubDataPointCluster
	
}

function createDataPointCluster(carDataPointType){
	var cluster = {
		id: carDataPointType,
		dataArray: new Array()
	};
	return cluster;
}

function createSubDataPointCluster(carDataPointType){
	var cluster = {
		id: carDataPointType,
		dataArray: new Array()
	};
	return cluster;
}

function createDataPoint(dataId, dataPointType, d, s){
	var dataPoint = {
		id: dataId,
		type: dataPointType,
		data: d,
		score: s
	};
	return dataPoint;
}

function createClusterInterface(id){
	var cluster = {
		carsArray: new Array(),
		clusterID: id,
		arrayOfClusters: new Array()
	};
	return cluster;
}

function sortCluster(cluster){
	cluster.sort(function(a, b){return a.data - b.data});
}

function findOjectNeighbors(dataId, cluster, range) {
	var neighbors = new Array();
	var index = cluster.findIndex(x=> x.id===dataId);
	var gonePastId = false;
	var clusterLength = cluster.length;
	for(var i=0;i<range;i++){
		if((index-range)<0){
			if(cluster[i].id===dataId){gonePastId=true;}
			neighbors.push((gonePastId===false)?cluster[i]:cluster[i+1]);
		}
		else if((index+range)>clusterLength){
			if(cluster[(clusterLength-1)-i].id===dataId){gonePastId=true;}
			neighbors.push((gonePastId===false)?cluster[(clusterLength-1)-i]:cluster[(clusterLength-1)-(i+1)]);
		}
		else {
			if(cluster[index-(range/2)+i].id===dataId){gonePastId=true;}
			neighbors.push((gonePastId===false)?cluster[index-(range/2)+i]:cluster[(index+1)-(range/2)+i]);
		}
		
	}
	return neighbors;
}

function findDataPointCluster(dataId, cluster){
	return cluster.arrayOfClusters.find(x=> x.id===dataId);
}

function findDataPoint(dataId, cluster){
	return cluster.dataArray.find(function(value){
		return value.id===id;
	});
}

function scoreObject(id, cluster){
	var neighbors = findOjectNeighbors(id, cluster, ((cluster.length/4)<40)?6:40);
	var newScore = 0;
	for(var i=0;i<neighbors.length;i++){
		newScore+=neighbors[i].score;
	}
	return newScore/neighbors.length;
}
},{}],23:[function(require,module,exports){
var cluster = require("./cluster.js/");
//var carObjects = require("./car-objects.json");

module.exports = {
	setup: setup,
	reScoreCars: reScoreCars
}

//"wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"/
function setup(cars, extCluster, clusterPrecreated){
	var clust = (clusterPrecreated===false)?setupDataClusters(cluster.createClusterInterface("newCluster")): extCluster;
	for(var i =0;i<cars.length;i++){
		if(cars[i].def.elite===false){
			addCarsToCluster(cars[i], clust);
			clust.carsArray.push(cars[i]);
		}
	}
	console.log(clust);//test
	return clust;
}

function setupDataClusters(mainCluster){
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("wheel_radius"));
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("chassis_density"));
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("wheel_vertex"));
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("vertex_list"));
	mainCluster.arrayOfClusters.push(cluster.createDataPointCluster("wheel_density"));
	return mainCluster;
}

function addCarsToCluster(car, clust){
	addDataToCluster(car.def.id, car.def.wheel_radius,car.score.s, cluster.findDataPointCluster("wheel_radius", clust));
    addDataToCluster(car.def.id, car.def.chassis_density,car.score.s, cluster.findDataPointCluster("chassis_density", clust));
	addDataToCluster(car.def.id, car.def.vertex_list,car.score.s, cluster.findDataPointCluster("vertex_list", clust));
	addDataToCluster(car.def.id, car.def.wheel_vertex,car.score.s, cluster.findDataPointCluster("wheel_vertex", clust));
	addDataToCluster(car.def.id, car.def.wheel_density,car.score.s, cluster.findDataPointCluster("wheel_density", clust));
}

function addDataToCluster(id, carData, score, clust){
	if(clust.dataArray.length===carData.length){
		for(var x=0;x<carData.length;x++){
			clust.dataArray[x].dataArray.push(cluster.createDataPoint(id, "", carData[x], score));
			cluster.sortCluster(clust.dataArray[x].dataArray);
		}
	}
	else {
		for(var i=0;i<carData.length;i++){
			var newClust = cluster.createSubDataPointCluster("");
			newClust.dataArray.push(cluster.createDataPoint(id, "", carData[i], score));
			clust.dataArray.push(newClust);
		}
	}
}

function reScoreCars(cars, clust){
	for(var i=0;i<cars.length;i++){
		var score = 0;
		for(var x=0;x<clust.arrayOfClusters.length;x++){
			for(var y=0;y<clust.arrayOfClusters[x].dataArray.length;y++){
				score += cluster.scoreObject(cars[i].def.id, clust.arrayOfClusters[x].dataArray[y].dataArray);
			}
		}
		cars[i].score.s += score/clust.arrayOfClusters.length;
	}
}


},{"./cluster.js/":22}],24:[function(require,module,exports){
/*var randomInt = require("./randomInt.js/");
var getRandomInt = randomInt.getRandomInt;*/

module.exports = {
	runCrossover: runCrossover
}

/*This function creates the acual new car and returned. The function runs a one-point crossover taking data from the parents passed through and adding them to the new car.
@param parents ObjectArray - Data is taken from these cars and added to the new car using crossover.
@param schema - The data objects that car objects have such as "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"
@param noCrossoverPoint int - The first crossover point randomly generated
@param noCrossoverPointTwo int - The second crossover point randomly generated 
@param carNo int - whether this car is the first or second child for the parent cars
@param parentScore int - The average score of the two parents
@param noCarsCreated int - The number of cars created so far, used for the new cars id
@param crossoverType int - The type of crossover to use such as 1 for One point crossover any other Two point crossover
@return car Object - A car object is created and returned*/
function combineData(parents, schema, noCrossoverPoint, noCrossoverPointTwo, carNo, parentScore,noCarsCreated, crossoverType){
	var id = noCarsCreated+carNo;
	var keyIteration = 0;
	return Object.keys(schema).reduce(function(crossDef, key){
      var schemaDef = schema[key];
      var values = [];
      for(var i = 0, l = schemaDef.length; i < l; i++){
        var p = crossover(carNo, noCrossoverPoint, noCrossoverPointTwo, keyIteration, crossoverType);
        values.push(parents[p][key][i]);
      }
      crossDef[key] = values;
	  keyIteration++;
      return crossDef;
    } , {
		id: id,
		parentsScore: parentScore
	});
}

/*This function chooses which car the data is taken from based on the parameters given to the function
@param carNo int - This is the number of the car being created between 1-2, filters cars data is being taken
@param noCrossoverPoint int - The first crossover point where data before or after the point is taken
@param noCrossoverPointTwo int - The second crossover point where data is before or after the point is taken
@param keyIteration int - This is the point at which the crossover is currently at which help specifies which cars data is relavent to take comparing this point to the one/two crossove points
@param crossoveType int - This specifies if one point(1) or two point crossover(any int) is used
@return int - Which parent data should be taken from is returned either 0 or 1*/
function crossover(carNo, noCrossoverPoint, noCrossoverPointTwo,keyIteration,crossoverType){
	if(crossoverType===1){ //run one-point crossover
		return (carNo===1)?(keyIteration>=noCrossoverPoint)?0:1:(keyIteration>=noCrossoverPoint)?1:0;// handles the fixed one-point switch over
	}
	else { //run two-point crossover
		if(carNo===1){
			if(((keyIteration>noCrossoverPoint)&&(keyIteration<noCrossoverPointTwo))||((keyIteration>noCrossoverPointTwo)&&(keyIteration<noCrossoverPoint))){
				return 0;
			}
			else { return 1;}
		}
		else{
			if(((keyIteration>noCrossoverPoint)&&(keyIteration<noCrossoverPointTwo))||((keyIteration>noCrossoverPointTwo)&&(keyIteration<noCrossoverPoint))){
				return 1;
			}
			else { return 0;}
		}
	}
}

/*This function randomly generates two crossover points and passes them to the crossover function
@param parents ObjectArray - An array of the parents objects
@param crossoverTpye int - Specified which crossover should be used
@param schema - Car object data template used for car creation
@param parentScore int - Average number of the parents score
@param noCarsCreated int - number of cars created for the simulation
@param noCarsToCreate int - the number of new cars that should be created via crossover
@return car ObjectArray - An array of newly created cars from the crossover are returned*/
function runCrossover(parents,crossoverType,schema, parentsScore,noCarsCreated, noCarsToCreate){
	var newCars = new Array();
	var crossoverPointOne=getRandomInt(0,4, new Array());
	var crossoverPointTwo=getRandomInt(0,4, [crossoverPointOne]);
	for(var i=0;i<noCarsToCreate;i++){
		newCars.push(combineData(parents,schema, crossoverPointOne, crossoverPointTwo, i, parentsScore,noCarsCreated,crossoverType));
	}
	return newCars;
}

/*This function returns whole ints between a minimum and maximum
@param min int - The minimum int that can be returned
@param max int - The maximum int that can be returned
@param notEqualsArr intArray - An array of the ints that the function should not return
@return int - The int within the specified parameter bounds is returned.*/
function getRandomInt(min, max, notEqualsArr) {
	var toReturn;
	var runLoop = true;
	while(runLoop===true){
		min = Math.ceil(min);
		max = Math.floor(max);
		toReturn = Math.floor(Math.random() * (max - min + 1)) + min;
		if(typeof findIfExists === "undefined"){
			runLoop=false;
		}
		else if(notEqualsArr.find(function(value){return value===toReturn;})===false){
			runLoop=false;
		}
	}
    return toReturn;//(typeof findIfExists === "undefined")?toReturn:getRandomInt(min, max, notEqualsArr);
}

},{}],25:[function(require,module,exports){
module.exports={"name":"objects","array":[{"id":"0.hdf5qn7vrm","wheel_radius":[0.5767690824721248,0.4177286154476836],"wheel_density":[0.05805828499322763,0.5558485029218216],"chassis_density":[0.01746922482830615],"vertex_list":[0.7941546027531794,0.33861058313418346,0.9817966727350886,0.04058391899039471,0.6792764840084577,0.7095516833429869,0.4442929689786037,0.37159709633978144,0.48655491389807315,0.8194897434679949,0.06791292762922252,0.8500617187981201],"wheel_vertex":[0.3197454833804805,0.07306832553443532,0.9696680221321918,0.2824291446288685,0.2380108435356263,0.03420163652850006,0.3930204478494015,0.9292589026168605],"index":0},{"id":"0.ddvqo9c4u5","wheel_radius":[0.07627311653690305,0.38077565824706383],"wheel_density":[0.01863697881086468,0.026864361789310287],"chassis_density":[0.7045568596969818],"vertex_list":[0.8827836738451413,0.4190617493499984,0.017147626844417063,0.2277553534525203,0.9391852300562391,0.41623535047479976,0.667874296655423,0.3184936092984223,0.885601792263214,0.1346539811623968,0.322385303872488,0.161407472396901],"wheel_vertex":[0.17206625167182543,0.2864306277502062,0.9385138859389617,0.7120516346789703,0.47681841776301215,0.9573420057371615,0.34779657603419056,0.4942428001369501],"index":1},{"id":"0.i58eicuogp","wheel_radius":[0.8797742202793692,0.4946090041701663],"wheel_density":[0.6907715700239563,0.35432984993561556],"chassis_density":[0.9971097639358597],"vertex_list":[0.3355939766795686,0.3677035616120996,0.25221017408131474,0.604213571816435,0.1430303697651747,0.6707414538501344,0.7976410790585797,0.0033040193157582998,0.48225864500530036,0.9722463490739863,0.13326685190618814,0.24511863681863266],"wheel_vertex":[0.9134632576763355,0.8028557179231353,0.06520887602002645,0.5008784841753418,0.29660822964929734,0.8268847970499333,0.7035107726768779,0.020149156720311145],"index":2},{"id":"0.gutj76a88f","wheel_radius":[0.9293229179821985,0.14096018806429722],"wheel_density":[0.9610668741784452,0.12918935045544622],"chassis_density":[0.4412938612774773],"vertex_list":[0.509666285390127,0.0440424703718838,0.32355514615481096,0.5028560491467837,0.8855525611846886,0.6634747633908817,0.053720135479725206,0.03939919113473578,0.8659130479988033,0.5292610191155793,0.25844974411733945,0.15674953593305863],"wheel_vertex":[0.10922529798546754,0.8697670750461268,0.8308079459877313,0.6383102766197528,0.7099969858096296,0.5389509745111423,0.8978376331961129,0.6420664501085884],"index":3},{"id":"0.s0qb8gd1uk8","wheel_radius":[0.7219865941050003,0.8749228764898627],"wheel_density":[0.8888827319734467,0.3633780972284817],"chassis_density":[0.7811514341788972],"vertex_list":[0.0710298251902226,0.04777839921760796,0.13258883889938056,0.9766647673306856,0.5400399336725707,0.009490303271581846,0.6105618345293602,0.30769684064628944,0.9536822130361375,0.6608960981573873,0.38788766841235356,0.14698211273515116],"wheel_vertex":[0.45796055398119706,0.5082384005387914,0.6910070637339527,0.49491480576195057,0.017564983056669536,0.9004187121939236,0.950888149443778,0.3145771879983139],"index":4},{"id":"0.am50skfifv8","wheel_radius":[0.4371782151705017,0.16934407528669593],"wheel_density":[0.5155615530382445,0.3746398626558487],"chassis_density":[0.9777831010398579],"vertex_list":[0.4218254332918403,0.13402991979798595,0.5679523833804261,0.9986360454712131,0.1370226529049714,0.6866226723994309,0.21085066722858148,0.11201281036347854,0.6458868083896243,0.7686349179192595,0.5631279410833077,0.8929527870277394],"wheel_vertex":[0.3201300463393102,0.7881304785297669,0.1994622663870953,0.5361312470790522,0.9372844704327077,0.6029566109207931,0.6654959920391821,0.2544075607920917],"index":5},{"id":"0.mjcg9femang","wheel_radius":[0.6075286178996335,0.02893235087829993],"wheel_density":[0.6881171089205549,0.36813690305177627],"chassis_density":[0.9194743667947931],"vertex_list":[0.9045666908132881,0.03170144930478025,0.3338413002137406,0.7848170385408266,0.8832407772242816,0.8265334718769144,0.9629695531244229,0.2736041402092191,0.8088087449763801,0.41076107312794563,0.8217996633679705,0.1483702365231736],"wheel_vertex":[0.11480781743513102,0.1697368994977173,0.22986415922054526,0.9511536546375357,0.780923129239145,0.7910268389663828,0.3456103464776277,0.9613859776527907],"index":6},{"id":"0.idfjve6f8t8","wheel_radius":[0.5411559581495173,0.44125053048089047],"wheel_density":[0.25909875492826284,0.47021399069456327],"chassis_density":[0.3613728202285016],"vertex_list":[0.41021391544269314,0.9881932969769589,0.49847114859554886,0.37319768768805983,0.005002513477929904,0.48993994550737674,0.9672756824011681,0.6109271173927,0.6698014751238872,0.9973690280950067,0.19443632869446215,0.047658470550454135],"wheel_vertex":[0.2864270744805486,0.19040083806112862,0.7719547618207676,0.3130688023992423,0.5529916364259202,0.9133434808376619,0.4711529062266886,0.8871360248210398],"index":7},{"id":"0.9kev7eefp3","wheel_radius":[0.29831527304858163,0.7544895716087605],"wheel_density":[0.1981877988356684,0.7017407123227355],"chassis_density":[0.12698002119723606],"vertex_list":[0.9189283243644228,0.6711416378673025,0.5079419289799354,0.6181036484244244,0.9479695662239411,0.26973353938956346,0.775651358892298,0.8756169233293907,0.05772602678811567,0.2554950773692868,0.7398641638106203,0.7116867640037474],"wheel_vertex":[0.13211088239213153,0.027042464603376004,0.0027046022484826793,0.9188908412047128,0.12734937330346696,0.6312409139785786,0.5458361143483772,0.4202780123037708],"index":8},{"id":"0.94ov1ivvd1g","wheel_radius":[0.4217454865568546,0.1493046286773776],"wheel_density":[0.15780014539785747,0.6349387909103907],"chassis_density":[0.2611015082022081],"vertex_list":[0.1614056198115068,0.7073385308831481,0.8865775204059925,0.3859295957226818,0.006323741490722901,0.5600717160338222,0.7150828584344404,0.46454515534837526,0.08787116907156722,0.7482726424381383,0.6007334079191868,0.3127118710322887],"wheel_vertex":[0.2436228357811132,0.8770990367388483,0.5563324518538395,0.215800578569187,0.7947741936679531,0.7453147294742604,0.7326655050104951,0.8125433747073709],"index":9},{"id":"0.euv3chfcog","wheel_radius":[0.506180192590908,0.4074301248023271],"wheel_density":[0.22819387088526755,0.20388407997970082],"chassis_density":[0.9868098499829738],"vertex_list":[0.8901104916221794,0.0382460536238427,0.01247621775189045,0.3198239375390004,0.24614261702584117,0.661214205610895,0.20887861407179376,0.30724427235234875,0.6906477993219471,0.13420328261045245,0.5562057663925064,0.5636912336060713],"wheel_vertex":[0.27292940315827985,0.8116694811049994,0.34305427081267625,0.737790370926398,0.7144049632051976,0.4136553492822954,0.9065788650669486,0.2673436684220467],"index":10},{"id":"0.3t73r089878","wheel_radius":[0.33434778236081897,0.3311075004472892],"wheel_density":[0.14826510887752065,0.748740057701869],"chassis_density":[0.09686964778059548],"vertex_list":[0.173451890973358,0.954957853504486,0.12969012388639367,0.8093440049579759,0.20662170223633236,0.5957475494308369,0.12093093644627673,0.23827678515406414,0.8782369771550591,0.18793972440902174,0.5340249844612774,0.6746936255896423],"wheel_vertex":[0.7737452828565528,0.2179732704223123,0.6433926126933227,0.05597399128863212,0.8364909201028081,0.5594266368540888,0.48026892671736365,0.13286338544745901],"index":11},{"id":"0.otp4mhgfflg","wheel_radius":[0.3096723890899076,0.3270905845862535],"wheel_density":[0.9519797779470658,0.4824659127948694],"chassis_density":[0.508849513971634],"vertex_list":[0.05385076804821032,0.4724615769754572,0.4759187607571993,0.8404392103904694,0.6068039184056986,0.24506037957624516,0.7890583591097218,0.4280727348285014,0.914308399814743,0.016679245786350494,0.023597365922794156,0.5472150478296525],"wheel_vertex":[0.9681325471086923,0.8440592804832436,0.5633043887572953,0.38659997190573114,0.9457256976802073,0.15689595746838436,0.5459903281063443,0.6834766601643341],"index":12},{"id":"0.m72cm8glci","wheel_radius":[0.4921190205702557,0.9730123122187448],"wheel_density":[0.6138731107622271,0.80188826074077],"chassis_density":[0.27336366221265496],"vertex_list":[0.48673379371347725,0.5616639421186809,0.6652628675453733,0.521127869483095,0.8826236680283714,0.7724370159671963,0.5328543643014874,0.48289945395031975,0.7011128939985845,0.9407919374959133,0.5196758016268144,0.26214607732622563],"wheel_vertex":[0.026968037135228773,0.8078115090468778,0.11567871694998044,0.2887653152210481,0.10871636169735654,0.29005831038415697,0.9705208285856395,0.8521699632762305],"index":13},{"id":"0.9hjuq0vark8","wheel_radius":[0.7377742272424606,0.27766419711539014],"wheel_density":[0.12067982288380974,0.5508429477497803],"chassis_density":[0.4742777307191277],"vertex_list":[0.475325738509615,0.653462696268186,0.23624452185059952,0.8624773295336279,0.3843663053567725,0.29624163876361664,0.8555864028060363,0.6153797712621405,0.022909313308777657,0.7078073819405373,0.2995603233023847,0.9591599855399191],"wheel_vertex":[0.915914626913259,0.6956844692079878,0.33284691963176405,0.7919985193630892,0.8846996483826077,0.7862606433515567,0.6523325763895098,0.8016109420768407],"index":14},{"id":"0.pk4uqro41u","wheel_radius":[0.8658881007803165,0.3357331986398473],"wheel_density":[0.5692064557307324,0.2791454871011563],"chassis_density":[0.3120375400367086],"vertex_list":[0.9189554009992524,0.3542579100478469,0.14964826963447164,0.9548992038109447,0.5136981847958031,0.5425422233324078,0.5382322667339448,0.6867404819061971,0.2403071409704176,0.5960192026151729,0.1981391854660728,0.0652119555215982],"wheel_vertex":[0.9382147287284206,0.6389032897639346,0.5745068606896859,0.3298007956203739,0.3748010225243654,0.1555312745759434,0.3488865368809815,0.2288608901580047],"index":15},{"id":"0.92pmqftm078","wheel_radius":[0.20940186357804302,0.9601831855684502],"wheel_density":[0.6074865062552535,0.487214084857744],"chassis_density":[0.8879779581417373],"vertex_list":[0.37229358911709576,0.3250638149302463,0.02399624334167294,0.5076844925929369,0.9361788706360077,0.5599877675198013,0.6178761701945197,0.19199515412459323,0.436893994490962,0.3409731423377498,0.4982559500560275,0.3018054779863344],"wheel_vertex":[0.4805567992416928,0.529172971508425,0.4576824490185867,0.28815816259966853,0.41307038021277576,0.8496303102150315,0.44262409410280923,0.118990835397361],"index":16},{"id":"0.p0bb3jcsa6o","wheel_radius":[0.8053770409363876,0.004608511505876489],"wheel_density":[0.37032936585319853,0.9110718290739903],"chassis_density":[0.41268931366555517],"vertex_list":[0.37505529616887445,0.3269894555788473,0.7824287339617897,0.08916755260272602,0.11846368789958772,0.6182305402069848,0.6883467480158929,0.38177905214995667,0.7208181609591433,0.7182811672980731,0.5053403982433966,0.6785485903889392],"wheel_vertex":[0.8602516434667127,0.9182412895648713,0.4943321446494058,0.4066814424053633,0.9450033934436965,0.04147678416903,0.9074303141025282,0.7920805318139295],"index":17},{"id":"0.g6nue40o6u","wheel_radius":[0.25950365179089285,0.45117196696361517],"wheel_density":[0.8737773207491646,0.3825049459175984],"chassis_density":[0.5750636056432643],"vertex_list":[0.16155077272274365,0.17401914773170235,0.4287580781076481,0.42932923860305827,0.47608143506731326,0.016141666182198033,0.7490069599283697,0.8779156633754976,0.6080928470185578,0.4845763154960605,0.15989694525876041,0.5492330632971734],"wheel_vertex":[0.4886604267859962,0.9507100553360299,0.8963786004106906,0.13962004268890382,0.017105305761339284,0.1203208130328568,0.9016859645440254,0.31282796595626206],"index":18},{"id":"0.uikpm9rmbb","wheel_radius":[0.0806451504762078,0.08423101469841532],"wheel_density":[0.34463928350406126,0.8694895031478671],"chassis_density":[0.14008481796461525],"vertex_list":[0.6860355827823672,0.9475637834183746,0.5480446481881946,0.2729072912678334,0.9158071629011582,0.5403677312919277,0.7110438375848036,0.34666135351410454,0.7835892647613154,0.2691403271699404,0.14436046411629033,0.27168516794708797],"wheel_vertex":[0.8176594755946187,0.6637355241449168,0.8402473944959381,0.6435582131301778,0.917040841042623,0.9824387525583211,0.49791639446670644,0.005377830182361487],"index":19},{"id":"0.phkod4h666o","wheel_radius":[0.3885121547052115,0.9408147796867175],"wheel_density":[0.6066760499920387,0.7437853735141478],"chassis_density":[0.047619348463744826],"vertex_list":[0.2818018188994671,0.5376711283235511,0.278265249347057,0.37180380749404063,0.0016354112440770674,0.3734920298406539,0.9258243649433546,0.9611282010648099,0.2635677758443302,0.2995122669698769,0.45009537621663176,0.14120495018961954],"wheel_vertex":[0.8211527025300243,0.6378520646150085,0.8433691242450887,0.10080112530514906,0.7420571718643294,0.06240659449537578,0.5019963798229192,0.13958803327033276],"index":20},{"id":"0.cdsb2t0a0gg","wheel_radius":[0.24505842176601966,0.47937570661588036],"wheel_density":[0.7318963359198882,0.20433591906714255],"chassis_density":[0.9440804013808017],"vertex_list":[0.2767177185735572,0.40191206919739253,0.6992520631753649,0.5805367054765673,0.5328760694595893,0.6051655266396856,0.8659374923698233,0.6385740518164591,0.09136175672495295,0.1946267162607933,0.5848324783419472,0.9612115069889817],"wheel_vertex":[0.9840419708674404,0.4002078328877534,0.6114668493004969,0.0547662826963875,0.7590263236186896,0.9095821718443651,0.8252785001445193,0.9354573503144779],"index":21},{"id":"0.5ec3f7uc86g","wheel_radius":[0.7428794526737739,0.14727079055353554],"wheel_density":[0.21720134324657558,0.5754268794146837],"chassis_density":[0.22476421424897008],"vertex_list":[0.8212963728160105,0.2297331892207486,0.21058817977645528,0.3002863349191449,0.16095424113953083,0.28570979035001876,0.8505053225959205,0.012099775565245663,0.43071909702961464,0.3581820673390337,0.9941396663350952,0.17115204663164763],"wheel_vertex":[0.6349365043647393,0.8564168056559227,0.8347314103983197,0.013561600989115519,0.20473813555899079,0.973788949531528,0.3298955475720191,0.704049870268243],"index":22},{"id":"0.o2m7e3jl5m","wheel_radius":[0.8661369447423091,0.36209186636855173],"wheel_density":[0.24886369948296272,0.9481136708961697],"chassis_density":[0.4645349071428597],"vertex_list":[0.3963158171740233,0.3256278822452916,0.4358865621693082,0.4180065756720124,0.03350757790126613,0.2681067495962719,0.19145799526267337,0.7371111884911565,0.4500408955195885,0.10688261567679347,0.3821541311464922,0.009416750541172192],"wheel_vertex":[0.9575462712867551,0.5695500762355803,0.7981443002154605,0.9474328403749823,0.7027016096400711,0.8286424663713696,0.8310500009461772,0.20389451798323543],"index":23},{"id":"0.vij7h4ll3ig","wheel_radius":[0.1814980076155488,0.26389762050722565],"wheel_density":[0.2829352972703518,0.7426468978176506],"chassis_density":[0.014486662613823365],"vertex_list":[0.05308677758606217,0.3660329920000105,0.9154588111109756,0.6599367403142471,0.006236701000372102,0.9416779757734717,0.8080809278339618,0.4249971585729182,0.43942023623270776,0.4463217820443348,0.740757020638958,0.09154286362854247],"wheel_vertex":[0.1701478887113994,0.23951500026651695,0.8417160753050081,0.44668632197313785,0.7984746620110903,0.24993050509729642,0.5982613413718036,0.024634143380375617],"index":24},{"id":"0.vbudpq7r8jg","wheel_radius":[0.1880833792086538,0.2909417556253724],"wheel_density":[0.3835353607487637,0.12542471127806198],"chassis_density":[0.9914887266787835],"vertex_list":[0.1408202327951953,0.9006563749172454,0.2860131896546747,0.5036058268015096,0.28237175351464594,0.6920935097717549,0.4030021430205859,0.4526349625334938,0.32951066138675067,0.9915639303248924,0.15421491780180507,0.5658120376445028],"wheel_vertex":[0.6207796081251498,0.08457529321879997,0.30959608934504557,0.9289887901506075,0.21134420090001038,0.26615847404781046,0.9679986325992576,0.036393266609056285],"index":25},{"id":"0.4igks77dflg","wheel_radius":[0.6162630688805109,0.996322195724116],"wheel_density":[0.07219389558395028,0.8163090041579422],"chassis_density":[0.6463871724924768],"vertex_list":[0.14686282939592732,0.3538624338089038,0.7352789107172508,0.8336219131334901,0.1345844214947911,0.0695711666235328,0.05891574961142054,0.5915082113269567,0.8106099081756695,0.09587631742587899,0.9775789162130557,0.620011000251137],"wheel_vertex":[0.23869164317299063,0.46960820534342784,0.9809209433980268,0.09408717517598952,0.9596228458615494,0.1493106650385012,0.5424116949883415,0.35068762039149237],"index":26},{"id":"0.i7in710f398","wheel_radius":[0.01074243535706998,0.37496150244395476],"wheel_density":[0.21761163033987585,0.28770690417266986],"chassis_density":[0.7788504774708707],"vertex_list":[0.9065045294527061,0.08320308349875738,0.03460864728278068,0.12885459498203744,0.7036120113589297,0.8301158151858712,0.3957769158442701,0.9897614345181391,0.0808815370561955,0.9435460667351685,0.3070266134901427,0.055233471026243874],"wheel_vertex":[0.22706240786290133,0.45363882858134663,0.4043110543388071,0.0466213326785736,0.17376130548777313,0.6419416055422196,0.45034182053638894,0.06303486495462352],"index":27},{"id":"0.96ivqppegag","wheel_radius":[0.4911179230902005,0.35046444691939094],"wheel_density":[0.33534449672897026,0.9335176580032427],"chassis_density":[0.31957538664110574],"vertex_list":[0.5926254873859351,0.7192087995229846,0.48449163046938826,0.7820757616208582,0.7462054398245774,0.09042624653203046,0.10702581503547992,0.9061878773626963,0.6522294122845294,0.6772711351923497,0.024511693552243807,0.8054593143058355],"wheel_vertex":[0.36029810438333065,0.6065237606237144,0.32602132171242637,0.5940415719076406,0.5821058694804442,0.6474690800650107,0.5906562254817702,0.47754843993265594],"index":28},{"id":"0.ffq8depchpg","wheel_radius":[0.19424114403784554,0.4111615025466757],"wheel_density":[0.7161119526969035,0.9210914218979367],"chassis_density":[0.6726066425877597],"vertex_list":[0.6087251491790631,0.7126922563608298,0.2848133218245028,0.2577778930560264,0.932291750560869,0.26024634386180456,0.9008608369751749,0.8196861793402688,0.049781128250446116,0.49846896499176063,0.42206776267989876,0.132826473899182],"wheel_vertex":[0.5527071271647432,0.6006663093919147,0.8888707647843714,0.24472713041630212,0.9264449367786494,0.008673983220342851,0.6561268639305937,0.800869840601915],"index":29},{"id":"0.31k1bsa29v8","wheel_radius":[0.5216579723226884,0.6938038782520572],"wheel_density":[0.7510504930846378,0.9360211671641339],"chassis_density":[0.9919692547833585],"vertex_list":[0.6202253450662798,0.8408932902288029,0.1467079955608943,0.9850450301241724,0.2334449761912203,0.28979123273254603,0.27093808017567866,0.19070462374783892,0.05336059782942826,0.827607292663183,0.931912342192549,0.43767176285957676],"wheel_vertex":[0.041586694728670714,0.0729827175190807,0.016916154905290748,0.4901454598823205,0.23119893679665826,0.02513006823214936,0.48938909863925995,0.3884350170537745],"index":30},{"id":"0.90kkvb4ucho","wheel_radius":[0.9101037992785472,0.4878592470115912],"wheel_density":[0.3848477970824631,0.45389049697961203],"chassis_density":[0.26080079893693164],"vertex_list":[0.5317932075935214,0.6878189310214191,0.9803101493711177,0.765751655053434,0.4060187183216988,0.11848729489072851,0.5735242259078523,0.9888373140171343,0.6631421747820911,0.5430329863620216,0.45982999435836613,0.8969676517036023],"wheel_vertex":[0.4054572620878496,0.381705658335161,0.6234951462381657,0.6433288559734538,0.857228266497932,0.8995549741199367,0.07651132793231885,0.7711765286985368],"index":31},{"id":"0.ajgtci3scg8","wheel_radius":[0.3351948140617189,0.6299731879087538],"wheel_density":[0.41534186810288554,0.2704413527223042],"chassis_density":[0.7013723526271509],"vertex_list":[0.7415782592669138,0.6352644432918293,0.17366602596210967,0.5072067934274973,0.5915560432013875,0.45493011325168453,0.2649409230524493,0.7562110356524923,0.07853292166813741,0.6154358760762721,0.8188030989851804,0.8748310389153457],"wheel_vertex":[0.10862349731806309,0.5857623668477845,0.47340786079757935,0.26666160156141405,0.7117025932806522,0.5334392851294998,0.9740204710346876,0.8119489411484921],"index":32},{"id":"0.ij6nllcc6j8","wheel_radius":[0.06576536071883776,0.2698134606168656],"wheel_density":[0.10826988964142781,0.4280793840639776],"chassis_density":[0.12451753555889056],"vertex_list":[0.9859276756591981,0.3236156178318257,0.23881710989060712,0.9085044838312986,0.07590918519143286,0.11783026761501492,0.7545494743180108,0.9830926222611833,0.2055190743128783,0.7084273553891405,0.6180798124777225,0.03837658378808495],"wheel_vertex":[0.26257958329367814,0.37422756343544883,0.9706637097723838,0.8270402872916975,0.6423470602861527,0.3049469603936841,0.020315424421025075,0.6731542315692196],"index":33},{"id":"0.cfamjkge14","wheel_radius":[0.5553371223441326,0.48255952545301195],"wheel_density":[0.10233567955957112,0.4118663994606462],"chassis_density":[0.8507010372498203],"vertex_list":[0.4435526144410815,0.7952571161216015,0.6956674298481698,0.7700381150426268,0.02443779192265727,0.3314924202264524,0.5348472872176893,0.16998983587117444,0.3702567531636358,0.13248871108359395,0.32421152908080253,0.12384389935429585],"wheel_vertex":[0.5562361777413118,0.02018197327300042,0.6656773966986882,0.34056707549167897,0.3228687248283031,0.005468963280792272,0.24874132312313169,0.007568029417329258],"index":34},{"id":"0.897upusp00o","wheel_radius":[0.9506221057739288,0.263467828878726],"wheel_density":[0.7810166453464373,0.38647992998898206],"chassis_density":[0.0735421825781255],"vertex_list":[0.33373114115871116,0.09869861121728296,0.1555855146519025,0.3174873187217855,0.4752826770773326,0.3299159892797654,0.19600097967524555,0.14925170964195633,0.006864524052712984,0.7532489017554023,0.438354172052676,0.31124012477685215],"wheel_vertex":[0.8498673328952575,0.48833250139633355,0.714801647554276,0.8987104136285196,0.9384108494792647,0.8839853876491639,0.4194011057562126,0.5022476949036452],"index":35},{"id":"0.eugue9pc7qo","wheel_radius":[0.14580879382814493,0.874400937581342],"wheel_density":[0.35057826376474344,0.49085712757371947],"chassis_density":[0.9261449817850527],"vertex_list":[0.1669027978157156,0.2688530561348279,0.4102379290204792,0.5814259556405568,0.44957812309096634,0.7507083572416744,0.07287773329701586,0.7974367736625725,0.06846180783077527,0.7344754291191549,0.5703026759329677,0.628933557495567],"wheel_vertex":[0.7917192328086229,0.5708019023659623,0.7765250209157932,0.29264234660147226,0.27938923378975344,0.14348106135106042,0.5609167555087855,0.5047442938192339],"index":36},{"id":"0.l6scl5ntjd","wheel_radius":[0.24557812148752567,0.6740496043706881],"wheel_density":[0.07800478790603682,0.5224295673385457],"chassis_density":[0.04608851170320549],"vertex_list":[0.3075353258067306,0.946497419967802,0.40629223029438566,0.2763741078982387,0.2564047413245427,0.9311538993240389,0.6453254163405322,0.6114796828964544,0.5378282883910244,0.19921609846644528,0.9653785345250194,0.39789096849914607],"wheel_vertex":[0.17526063711196405,0.5219227364785715,0.19228400828285652,0.4747119812082834,0.12939951976376407,0.9719157459336423,0.05855057550033971,0.17011606800359047],"index":37},{"id":"0.skr6mmi0sug","wheel_radius":[0.13019903595315174,0.6978847412153089],"wheel_density":[0.9380383929168379,0.9006263152797596],"chassis_density":[0.5362153572215496],"vertex_list":[0.7898533203452032,0.04826996095952185,0.10461690807436286,0.19143508600849146,0.8187561846892544,0.2535765016568483,0.4644271093103154,0.7747321663565605,0.7155888564099566,0.22773684985020748,0.8764042408069712,0.25650019822349357],"wheel_vertex":[0.9742245496507285,0.38649515346286556,0.330704831027097,0.8695117307217375,0.8324213556099074,0.1815734170046004,0.40685293714777715,0.36774085813193635],"index":38},{"id":"0.0bod8ulve58","wheel_radius":[0.5690838202354156,0.24947317707233663],"wheel_density":[0.5327172442416095,0.5221831496178757],"chassis_density":[0.858638303927433],"vertex_list":[0.6544165849856707,0.7921670656120694,0.22828101591886552,0.6608910536558867,0.025260356428931097,0.7044614209271924,0.9761907228962194,0.4711649209146893,0.5727050275473584,0.8272756635204241,0.3982557215345284,0.546708833415614],"wheel_vertex":[0.20255946416681603,0.2824579920782291,0.30185189504063725,0.7373091921243422,0.8353113639169545,0.8787308062707437,0.20223004484930285,0.7812766443788959],"index":39}]}
},{}],26:[function(require,module,exports){
var create = require("../create-instance");
var selection = require("./selection.js/");
var mutation = require("./mutation.js/");
var crossover = require("./crossover.js/");
var cluster = require("./clustering/clusterSetup.js/");
var randomInt = require("./randomInt.js/");
var getRandomInt = randomInt.getRandomInt;

module.exports = {
  generationZero: generationZero,
  nextGeneration: nextGeneration
}

function generationZero(config){
  var generationSize = config.generationSize,
  schema = config.schema;
  var useFile = false;
  var cw_carGeneration = [];
  if(useFile===true){
	  cw_carGeneration= readFile();
  }
  else {
	  for (var k = 0; k < generationSize; k++) {
		var def = create.createGenerationZero(schema, function(){
		return Math.random()
		});
		def.index = k;
		cw_carGeneration.push(def);
	}
  }
  return {
    counter: 0,
    generation: cw_carGeneration,
  };
}

//--------------------------------------------------------------------------- my code job64
/*This function loads an initial car population from a .json file*/
function readFile(){
	var fs = require('fs');
	var array = [];
	var file = require("./initialCars.json/");
	for(var i = 0;i<file.array.length;i++){
		array.push(file.array[i]);
	}
	return array;
}

/*This function Chooses which selection operator to use in the selection of two parents for two new cars such as either Tournament or Roulette-wheel selection
@param parents ObjectArray - Adding the selected object into this array
@param scores ObjectArray - An array of cars where the parents will be selected from
@param increaseMate Boolean - Whether the current selection will include an elite where if true it wont be deleted from the Object array allowing it to be used again
@return parentsScore int - returns the average score of the parents*/
function selectParents(parents, scores, increaseMate){
	var parent1 = selection.runSelection(scores,(increaseMate===false)?1:2,true, true, false);
	parents.push(parent1.def);
	if(increaseMate===false){
		scores.splice(scores.findIndex(x=> x.def.id===parents[0].id),1);
	}
	var parent2 = selection.runSelection(scores,(increaseMate===false)?1:2,true, true, false);
	parents.push(parent2.def);
	scores.splice(scores.findIndex(x=> x.def.id===parents[1].id),1);
	return (parent1.score.s + parent2.score.s)/2;
}

/*This function runs a Evolutionary algorithm which uses Selection, Crossover and mutations to create the new populations of cars.
@param scores ObjectArray - An array which holds the car objects and there performance scores
@param config - This is the generationConfig file passed through which gives the cars template/blueprint for creation
@param noCarsCreated int - The number of cars there currently exist used for creating the id of new cars
@return newGeneration ObjectArray - is returned with all the newly created cars that will be in the simulation*/
function runEA(scores, config, noCarsCreated){
	scores.sort(function(a, b){return b.score.s - a.score.s;});
	var generationSize=scores.length;
	var newGeneration = new Array();
	var randomMateIncrease = getRandomInt(0,maxNoMatesIncreases, new Array());
	var maxNoMatesIncreases = 0;
	var currentNoMateIncreases = 1;
	var noElites=3;
	for(var i=0;i<noElites;i++){//add new elites to newGeneration
		var newElite = scores[0].def;
		newElite.elite = true;
		newGeneration.push(newElite);
	}
	for(var k = 0;k<generationSize/2;k++){
		if(newGeneration.length!==generationSize){
		var pickedParents = [];
		var parentsScore = selectParents(pickedParents, scores, ((k===randomMateIncrease)&&(currentNoMateIncreases<maxNoMatesIncreases))?true:false); 
		if(currentNoMateIncreases<maxNoMatesIncreases){currentNoMateIncreases++;}
			var newCars = crossover.runCrossover(pickedParents,0,config.schema, parentsScore, noCarsCreated, (newGeneration.length===generationSize-1)?1:2);
			for(var i=0;i<newCars.length;i++){
				newCars[i].elite = false;
				newCars[i].index = k;
				newGeneration.push(newCars[i]);
				noCarsCreated++;// used in car id creation
			}
		}
	}	
	newGeneration.sort(function(a, b){return a.parentsScore - b.parentsScore;});
	for(var x = 0;x<newGeneration.length;x++){
			var currentID = newGeneration[x].id;
			if(newGeneration[x].elite===false){
				//newGeneration[x] = mutation.multiMutations(newGeneration[x],newGeneration.findIndex(x=> x.id===currentID),20);
				newGeneration[x] = mutation.mutate(newGeneration[x]);
			}
		}
		console.log(newGeneration);
	return newGeneration;
}

/*This function runs the Baseline Evolutionary algorithm which only runs a mutation or multiMutations over all the cars passed though in the scores parameter.
@param scores Array - This parameter is an array of cars that holds the score statistics and car data such as id and "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"
@param config - This passes a file with functions that can be called.
@return newGeneration - this is the new population that have had mutations applied to them.*/
function runBaselineEA(scores, config){
	scores.sort(function(a, b){return a.score.s - b.score.s;});
	var schema = config.schema;//list of car variables i.e "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"
	var newGeneration = new Array();
	var generationSize=scores.length;
	console.log(scores);//test data
	for (var k = 0; k < generationSize; k++) {
		//newGeneration.push(mutation.mutate(scores[k].def));
		newGeneration.push(mutation.multiMutations(scores[k].def,scores.findIndex(x=> x.def.id===scores[k].def.id),20));
		newGeneration[k].is_elite = false;
		newGeneration[k].index = k;
	}
	
	return newGeneration;
}	

/*
This function handles the choosing of which Evolutionary algorithm to run and returns the new population to the simulation*/
function nextGeneration(previousState, scores, config){
	var generationSize=scores.length;
	var newGeneration = new Array();
	var count;
	var tempRound=0;
	
		tempRound=(typeof previousState.round ==="undefined")?0:previousState.round;
		count = previousState.counter + 1;
		//var clusterInt = (previousState.counter===0)?cluster.setup(scores,null,false):cluster.setup(scores,previousState.clust,true);
		//cluster.reScoreCars(scores ,clusterInt);
		scores.sort(function(a, b){return a.score.s - b.score.s;});
		var numberOfCars = (previousState.counter===0)?generationSize:previousState.noCars+generationSize;
		var schema = config.schema;//list of car variables i.e "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex"
	
		console.log("Log -- "+previousState.counter);
		//console.log(scoresData);//test data
		var eaType = 1;
		newGeneration = (eaType===1)?runEA(scores, config, numberOfCars, previousState.stateAveragesArr):runBaselineEA(scores, config);
		//console.log(newGeneration);//test data
	if(previousState.counter>150){
		count=0;
		tempRound++;
		//newGeneration=generationZero(config).generation;
		
	}
	
  return {
    counter: count,
    generation: newGeneration,
	//clust: clusterInt,
	noCars: numberOfCars,
	round: tempRound
  };
}


//------------------------------------------------------------------------------ end of my code job64


function makeChild(config, parents){
  var schema = config.schema,
    pickParent = config.pickParent;
  return create.createCrossBreed(schema, parents, pickParent)
}



function mutate(config, parent){
  var schema = config.schema,
    mutation_range = config.mutation_range,
    gen_mutation = config.gen_mutation,
    generateRandom = config.generateRandom;
  return create.createMutatedClone(
    schema,
    generateRandom,
    parent,
    Math.max(mutation_range),
    gen_mutation
  )
}

},{"../create-instance":21,"./clustering/clusterSetup.js/":23,"./crossover.js/":24,"./initialCars.json/":25,"./mutation.js/":27,"./randomInt.js/":28,"./selection.js/":29,"fs":1}],27:[function(require,module,exports){
module.exports = {
	mutate: mutate,
	multiMutations: multiMutations
}

/*This function returns whole ints between a minimum and maximum
@param min int - The minimum int that can be returned
@param max int - The maximum int that can be returned
@param notEqualsArr intArray - An array of the ints that the function should not return
@return int - The int within the specified parameter bounds is returned.*/
function getRandomInt(min, max, notEqualsArr) {
	var toReturn;
	var runLoop = true;
	while(runLoop===true){
		min = Math.ceil(min);
		max = Math.floor(max);
		toReturn = Math.floor(Math.random() * (max - min + 1)) + min;
		if(typeof findIfExists === "undefined"){
			runLoop=false;
		}
		else if(notEqualsArr.find(function(value){return value===toReturn;})===false){
			runLoop=false;
		}
	}
    return toReturn;//(typeof findIfExists === "undefined")?toReturn:getRandomInt(min, max, notEqualsArr);
}


function changeArrayValue(originalValue){
	for(var i=0;i<originalValue.length;i++){
		var randomFloat = Math.random();
		var mutationRate = 0.5*randomFloat;//Math.random();
		var increaseOrDecrease = getRandomInt(0,1,[]);
		newValue = (increaseOrDecrease===0)?originalValue[i]-mutationRate:originalValue[i]+mutationRate;
		if(newValue<0){
			newValue = originalValue[i]+mutationRate;
		} else if(newValue>1){
			newValue = originalValue[i]-mutationRate;
		}
		originalValue[i] = newValue;
	}
	return originalValue;
}

function mutate(car){
	return changeData(car,new Array(),1);
}

function changeData(car, multiMutations, noMutations){
	var randomInt = getRandomInt(1,4, multiMutations);
	if(randomInt===1){
		car.chassis_density=changeArrayValue(car.chassis_density);
	}
	else if(randomInt===2){
		car.vertex_list=changeArrayValue(car.vertex_list);
	}
	else if(randomInt===3){
		car.wheel_density=changeArrayValue(car.wheel_density);
	}
	else if(randomInt===4){
		car.wheel_radius=changeArrayValue(car.wheel_radius);
	}
	else {
		car.wheel_vertex=changeArrayValue(car.wheel_vertex);
	}
	multiMutations.push(randomInt);
	noMutations--;
	return (noMutations===0)?car:changeData(car, multiMutations, noMutations);
}

function multiMutations(car, arrPosition, arrSize){
	//var noMutations = (arrPosition<(arrSize/2))?(arrPosition<(arrSize/4))?4:3:(arrPosition>arrSize-(arrSize/4))?1:2;
	var noMutations = (arrPosition<10)?3:1;
	return changeData(car, new Array(),noMutations);
}
},{}],28:[function(require,module,exports){
 module.exports = {
	getRandomInt: getRandomInt
 }
 
/*This is a recursive function which returns whole ints between a minimum and maximum
@param min int - The minimum int that can be returned
@param max int - The maximum int that can be returned
@param notEqualsArr intArray - An array of the ints that the function should not return
@return int - The int within the specified parameter bounds is returned.*/
function getRandomInt(min, max, notEqualsArr) {
	var toReturn;
	var runLoop = true;
	while(runLoop===true){
		min = Math.ceil(min);
		max = Math.floor(max);
		toReturn = Math.floor(Math.random() * (max - min + 1)) + min;
		if(typeof findIfExists === "undefined"){
			runLoop=false;
		}
		else if(notEqualsArr.find(function(value){return value===toReturn;})===false){
			runLoop=false;
		}
	}
    return toReturn;//(typeof findIfExists === "undefined")?toReturn:getRandomInt(min, max, notEqualsArr);
}
},{}],29:[function(require,module,exports){
//var randomInt = require("./randomInt.js/");
//var getRandomInt = randomInt.getRandomInt;

module.exports = {
	runSelection: runSelection
}
/*
This function changes the type of selection used depending on the parameter number "selectType" = (rouleteWheelSel - 1, tournamentSelection - 2)
@param strongest boolean  - this parameter is passed through to the tournamentSelection function where true is return the strongest and false get weakest
@param selectType int - this parameter determines the type of selection used.
@param carsArr Array - this parameter is the population which the selection functions are used on.
@param useSubSet boolean - true if you want tournamentSelection to use sub sets not the global population
@return ObjectArray - the parents array of two is returned from either tournament or roullete wheel selection*/
function runSelection(carsArr, selectType, strongest, useSubSet, uniform){
	if(selectType===1){
		return rouleteWheelSel(carsArr, uniform);
	} 
	else if(selectType===2){
		return tournamentSelection(carsArr,strongest,carsArr.length/4, useSubSet);
	}
}

/*This function uses finess proportionate selection where a proportion of the wheel is given to a car based on fitness
@param carsArr ObjectArray - The array of cars where the parents are chosen from
@param uniform boolean - whether the selection should be uniform
@return car Object - A car object is returned after selection*/
function rouleteWheelSel(carsArr, uniform){
	if(uniform ===false){
		var sumCarScore = 0;
		for(var i =0;i<carsArr.length;i++){
			sumCarScore += carsArr[i].score.s;
		}
		/*console.log("selection data -");
		console.log(carsArr.length);
		console.log(sumCarScore);//test no
		*/
		var no = Math.random() * sumCarScore;
		if(sumCarScore!=0){
			for(var x =0;x<carsArr.length;x++){
				no -= carsArr[x].score.s;
				if(no<0){
					//console.log(carsArr[x]);//returned car
					return carsArr[x];
				}
				
			}
		}
		else{
			return carsArr[0];
		}
	} else {
		var randNo = getRandomInt(0, carsArr.length-1,[]);
		return carsArr[randNo];
	}
}

/*This function uses tournamentSelection where a array is sorted and the strongest or weakest is returned
@param carsArr ObjectArray - The array of cars where the parents are chosen from
@param strongest Boolean - if true the strongest car is chosen, else if false the weakest is returned 
@param subSetRange int - How big the subSet of the global array should be
@param useSubSet boolean - true if you want to use sub set of randomly chosen objects from the global, or false to just use the global
@return car Object - A car object is returned after selection*/
function tournamentSelection(carsArr, strongest, subSetRange, useSubSet){
	var subSet = [];
	if(useSubSet===true){
	var chosenInts = [];
	for(var i =0;i<subSetRange;i++){
		var chosenNo = getRandomInt(0,carsArr.length-1,chosenInts);
		chosenInts.push(chosenNo);
		subSet.push(carsArr[chosenNo]);
	}
	}
	(useSubSet===true)?subSet:carsArr.sort(function(a,b){return (strongest===true)?b.score.s - a.score.s:a.score.s - a.score.b;});
	return (useSubSet===true)?subSet[0]:carsArr[0];
}

/*This function returns whole ints between a minimum and maximum
@param min int - The minimum int that can be returned
@param max int - The maximum int that can be returned
@param notEqualsArr intArray - An array of the ints that the function should not return
@return int - The int within the specified parameter bounds is returned.*/
function getRandomInt(min, max, notEqualsArr) {
	var toReturn;
	var runLoop = true;
	while(runLoop===true){
		min = Math.ceil(min);
		max = Math.floor(max);
		toReturn = Math.floor(Math.random() * (max - min + 1)) + min;
		if(typeof findIfExists === "undefined"){
			runLoop=false;
		}
		else if(notEqualsArr.find(function(value){return value===toReturn;})===false){
			runLoop=false;
		}
	}
    return toReturn;//(typeof findIfExists === "undefined")?toReturn:getRandomInt(min, max, notEqualsArr);
}


},{}],30:[function(require,module,exports){


const random = {
  shuffleIntegers(prop, generator){
    return random.mapToShuffle(prop, random.createNormals({
      length: prop.length || 10,
      inclusive: true,
    }, generator));
  },
  createIntegers(prop, generator){
    return random.mapToInteger(prop, random.createNormals({
      length: prop.length,
      inclusive: true,
    }, generator));
  },
  createFloats(prop, generator){
    return random.mapToFloat(prop, random.createNormals({
      length: prop.length,
      inclusive: true,
    }, generator));
  },
  createNormals(prop, generator){
    var l = prop.length;
    var values = [];
    for(var i = 0; i < l; i++){
      values.push(
        createNormal(prop, generator)
      );
    }
    return values;
  },
  mutateShuffle(
    prop, generator, originalValues, mutation_range, chanceToMutate
  ){
    return random.mapToShuffle(prop, random.mutateNormals(
      prop, generator, originalValues, mutation_range, chanceToMutate
    ));
  },
  mutateIntegers(prop, generator, originalValues, mutation_range, chanceToMutate){
    return random.mapToInteger(prop, random.mutateNormals(
      prop, generator, originalValues, mutation_range, chanceToMutate
    ));
  },
  mutateFloats(prop, generator, originalValues, mutation_range, chanceToMutate){
    return random.mapToFloat(prop, random.mutateNormals(
      prop, generator, originalValues, mutation_range, chanceToMutate
    ));
  },
  mapToShuffle(prop, normals){
    var offset = prop.offset || 0;
    var limit = prop.limit || prop.length;
    var sorted = normals.slice().sort(function(a, b){
      return a - b;
    });
    return normals.map(function(val){
      return sorted.indexOf(val);
    }).map(function(i){
      return i + offset;
    }).slice(0, limit);
  },
  mapToInteger(prop, normals){
    prop = {
      min: prop.min || 0,
      range: prop.range || 10,
      length: prop.length
    }
    return random.mapToFloat(prop, normals).map(function(float){
      return Math.round(float);
    });
  },
  mapToFloat(prop, normals){
    prop = {
      min: prop.min || 0,
      range: prop.range || 1
    }
    return normals.map(function(normal){
      var min = prop.min;
      var range = prop.range;
      return min + normal * range
    })
  },
  mutateNormals(prop, generator, originalValues, mutation_range, chanceToMutate){
    var factor = (prop.factor || 1) * mutation_range
    return originalValues.map(function(originalValue){
      if(generator() > chanceToMutate){
        return originalValue;
      }
      return mutateNormal(
        prop, generator, originalValue, factor
      );
    });
  }
};

module.exports = random;

function mutateNormal(prop, generator, originalValue, mutation_range){
  if(mutation_range > 1){
    throw new Error("Cannot mutate beyond bounds");
  }
  var newMin = originalValue - 0.5;
  if (newMin < 0) newMin = 0;
  if (newMin + mutation_range  > 1)
    newMin = 1 - mutation_range;
  var rangeValue = createNormal({
    inclusive: true,
  }, generator);
  return newMin + rangeValue * mutation_range;
}

function createNormal(prop, generator){
  if(!prop.inclusive){
    return generator();
  } else {
    return generator() < 0.5 ?
    generator() :
    1 - generator();
  }
}

},{}],31:[function(require,module,exports){
/* globals btoa */
var setupScene = require("./setup-scene");
var carRun = require("../car-schema/run");
var defToCar = require("../car-schema/def-to-car");

module.exports = runDefs;
function runDefs(world_def, defs, listeners) {
  if (world_def.mutable_floor) {
    // GHOST DISABLED
    world_def.floorseed = btoa(Math.seedrandom());
  }

  var scene = setupScene(world_def);
  scene.world.Step(1 / world_def.box2dfps, 20, 20);
  console.log("about to build cars");
  var cars = defs.map((def, i) => {
    return {
      index: i,
      def: def,
      car: defToCar(def, scene.world, world_def),
      state: carRun.getInitialState(world_def)
    };
  });
  var alivecars = cars;
  return {
    scene: scene,
    cars: cars,
    step: function () {
      if (alivecars.length === 0) {
        throw new Error("no more cars");
      }
      scene.world.Step(1 / world_def.box2dfps, 20, 20);
      listeners.preCarStep();
      alivecars = alivecars.filter(function (car) {
        car.state = carRun.updateState(
          world_def, car.car, car.state
        );
        var status = carRun.getStatus(car.state, world_def);
        listeners.carStep(car);
        if (status === 0) {
          return true;
        }
        car.score = carRun.calculateScore(car.state, world_def);
        listeners.carDeath(car);

        var world = scene.world;
        var worldCar = car.car;
        world.DestroyBody(worldCar.chassis);

        for (var w = 0; w < worldCar.wheels.length; w++) {
          world.DestroyBody(worldCar.wheels[w]);
        }

        return false;
      })
      if (alivecars.length === 0) {
        listeners.generationEnd(cars);
      }
    }
  }

}

},{"../car-schema/def-to-car":4,"../car-schema/run":5,"./setup-scene":32}],32:[function(require,module,exports){
/* globals b2World b2Vec2 b2BodyDef b2FixtureDef b2PolygonShape */

/*

world_def = {
  gravity: {x, y},
  doSleep: boolean,
  floorseed: string,
  tileDimensions,
  maxFloorTiles,
  mutable_floor: boolean
}

*/

module.exports = function(world_def){

  var world = new b2World(world_def.gravity, world_def.doSleep);
  var floorTiles = cw_createFloor(
    world,
    world_def.floorseed,
    world_def.tileDimensions,
    world_def.maxFloorTiles,
    world_def.mutable_floor
  );

  var last_tile = floorTiles[
    floorTiles.length - 1
  ];
  var last_fixture = last_tile.GetFixtureList();
  var tile_position = last_tile.GetWorldPoint(
    last_fixture.GetShape().m_vertices[3]
  );
  world.finishLine = tile_position.x;
  return {
    world: world,
    floorTiles: floorTiles,
    finishLine: tile_position.x
  };
}

function cw_createFloor(world, floorseed, dimensions, maxFloorTiles, mutable_floor) {
  var last_tile = null;
  var tile_position = new b2Vec2(-5, 0);
  var cw_floorTiles = [];
  Math.seedrandom(floorseed);
  for (var k = 0; k < maxFloorTiles; k++) {
    if (!mutable_floor) {
      // keep old impossible tracks if not using mutable floors
      last_tile = cw_createFloorTile(
        world, dimensions, tile_position, (Math.random() * 3 - 1.5) * 1.5 * k / maxFloorTiles
      );
    } else {
      // if path is mutable over races, create smoother tracks
      last_tile = cw_createFloorTile(
        world, dimensions, tile_position, (Math.random() * 3 - 1.5) * 1.2 * k / maxFloorTiles
      );
    }
    cw_floorTiles.push(last_tile);
    var last_fixture = last_tile.GetFixtureList();
    tile_position = last_tile.GetWorldPoint(last_fixture.GetShape().m_vertices[3]);
  }
  return cw_floorTiles;
}


function cw_createFloorTile(world, dim, position, angle) {
  var body_def = new b2BodyDef();

  body_def.position.Set(position.x, position.y);
  var body = world.CreateBody(body_def);
  var fix_def = new b2FixtureDef();
  fix_def.shape = new b2PolygonShape();
  fix_def.friction = 0.5;

  var coords = new Array();
  coords.push(new b2Vec2(0, 0));
  coords.push(new b2Vec2(0, -dim.y));
  coords.push(new b2Vec2(dim.x, -dim.y));
  coords.push(new b2Vec2(dim.x, 0));

  var center = new b2Vec2(0, 0);

  var newcoords = cw_rotateFloorTile(coords, center, angle);

  fix_def.shape.SetAsArray(newcoords);

  body.CreateFixture(fix_def);
  return body;
}

function cw_rotateFloorTile(coords, center, angle) {
  return coords.map(function(coord){
    return {
      x: Math.cos(angle) * (coord.x - center.x) - Math.sin(angle) * (coord.y - center.y) + center.x,
      y: Math.sin(angle) * (coord.x - center.x) + Math.cos(angle) * (coord.y - center.y) + center.y,
    };
  });
}

},{}]},{},[20])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwic3JjL2Nhci1zY2hlbWEvY2FyLWNvbnN0YW50cy5qc29uIiwic3JjL2Nhci1zY2hlbWEvY29uc3RydWN0LmpzIiwic3JjL2Nhci1zY2hlbWEvZGVmLXRvLWNhci5qcyIsInNyYy9jYXItc2NoZW1hL3J1bi5qcyIsInNyYy9kcmF3L2RyYXctY2FyLXN0YXRzLmpzIiwic3JjL2RyYXcvZHJhdy1jYXIuanMiLCJzcmMvZHJhdy9kcmF3LWNpcmNsZS5qcyIsInNyYy9kcmF3L2RyYXctZmxvb3IuanMiLCJzcmMvZHJhdy9kcmF3LXZpcnR1YWwtcG9seS5qcyIsInNyYy9kcmF3L3Bsb3QtZ3JhcGhzLmpzIiwic3JjL2RyYXcvc2NhdHRlci1wbG90LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL2dlbmVyYXRlUmFuZG9tLmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL2luYnJlZWRpbmctY29lZmZpY2llbnQuanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvaW5kZXguanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvcGlja1BhcmVudC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9zZWxlY3RGcm9tQWxsUGFyZW50cy5qcyIsInNyYy9naG9zdC9jYXItdG8tZ2hvc3QuanMiLCJzcmMvZ2hvc3QvaW5kZXguanMiLCJzcmMvaW5kZXguanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9jcmVhdGUtaW5zdGFuY2UuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9jbHVzdGVyaW5nL2NsdXN0ZXIuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9jbHVzdGVyaW5nL2NsdXN0ZXJTZXR1cC5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL2Nyb3Nzb3Zlci5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL2luaXRpYWxDYXJzLmpzb24iLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9tYW5hZ2Utcm91bmQuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9tdXRhdGlvbi5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL3JhbmRvbUludC5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL3NlbGVjdGlvbi5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL3JhbmRvbS5qcyIsInNyYy93b3JsZC9ydW4uanMiLCJzcmMvd29ybGQvc2V0dXAtc2NlbmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3B0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RHQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiIiwibW9kdWxlLmV4cG9ydHM9e1xyXG4gIFwid2hlZWxDb3VudFwiOiAyLFxyXG4gIFwid2hlZWxNaW5SYWRpdXNcIjogMC4yLFxyXG4gIFwid2hlZWxSYWRpdXNSYW5nZVwiOiAwLjUsXHJcbiAgXCJ3aGVlbE1pbkRlbnNpdHlcIjogNDAsXHJcbiAgXCJ3aGVlbERlbnNpdHlSYW5nZVwiOiAxMDAsXHJcbiAgXCJjaGFzc2lzRGVuc2l0eVJhbmdlXCI6IDMwMCxcclxuICBcImNoYXNzaXNNaW5EZW5zaXR5XCI6IDMwLFxyXG4gIFwiY2hhc3Npc01pbkF4aXNcIjogMC4xLFxyXG4gIFwiY2hhc3Npc0F4aXNSYW5nZVwiOiAxLjFcclxufVxyXG4iLCJ2YXIgY2FyQ29uc3RhbnRzID0gcmVxdWlyZShcIi4vY2FyLWNvbnN0YW50cy5qc29uXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgd29ybGREZWY6IHdvcmxkRGVmLFxyXG4gIGNhckNvbnN0YW50czogZ2V0Q2FyQ29uc3RhbnRzLFxyXG4gIGdlbmVyYXRlU2NoZW1hOiBnZW5lcmF0ZVNjaGVtYVxyXG59XHJcblxyXG5mdW5jdGlvbiB3b3JsZERlZigpe1xyXG4gIHZhciBib3gyZGZwcyA9IDYwO1xyXG4gIHJldHVybiB7XHJcbiAgICBncmF2aXR5OiB7IHk6IDAgfSxcclxuICAgIGRvU2xlZXA6IHRydWUsXHJcbiAgICBmbG9vcnNlZWQ6IFwiYWJjXCIsXHJcbiAgICBtYXhGbG9vclRpbGVzOiAyMDAsXHJcbiAgICBtdXRhYmxlX2Zsb29yOiBmYWxzZSxcclxuICAgIG1vdG9yU3BlZWQ6IDIwLFxyXG4gICAgYm94MmRmcHM6IGJveDJkZnBzLFxyXG4gICAgbWF4X2Nhcl9oZWFsdGg6IGJveDJkZnBzICogMTAsXHJcbiAgICB0aWxlRGltZW5zaW9uczoge1xyXG4gICAgICB3aWR0aDogMS41LFxyXG4gICAgICBoZWlnaHQ6IDAuMTVcclxuICAgIH1cclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRDYXJDb25zdGFudHMoKXtcclxuICByZXR1cm4gY2FyQ29uc3RhbnRzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0ZVNjaGVtYSh2YWx1ZXMpe1xyXG4gIHJldHVybiB7XHJcbiAgICB3aGVlbF9yYWRpdXM6IHtcclxuICAgICAgdHlwZTogXCJmbG9hdFwiLFxyXG4gICAgICBsZW5ndGg6IHZhbHVlcy53aGVlbENvdW50LFxyXG4gICAgICBtaW46IHZhbHVlcy53aGVlbE1pblJhZGl1cyxcclxuICAgICAgcmFuZ2U6IHZhbHVlcy53aGVlbFJhZGl1c1JhbmdlLFxyXG4gICAgICBmYWN0b3I6IDEsXHJcbiAgICB9LFxyXG4gICAgd2hlZWxfZGVuc2l0eToge1xyXG4gICAgICB0eXBlOiBcImZsb2F0XCIsXHJcbiAgICAgIGxlbmd0aDogdmFsdWVzLndoZWVsQ291bnQsXHJcbiAgICAgIG1pbjogdmFsdWVzLndoZWVsTWluRGVuc2l0eSxcclxuICAgICAgcmFuZ2U6IHZhbHVlcy53aGVlbERlbnNpdHlSYW5nZSxcclxuICAgICAgZmFjdG9yOiAxLFxyXG4gICAgfSxcclxuICAgIGNoYXNzaXNfZGVuc2l0eToge1xyXG4gICAgICB0eXBlOiBcImZsb2F0XCIsXHJcbiAgICAgIGxlbmd0aDogMSxcclxuICAgICAgbWluOiB2YWx1ZXMuY2hhc3Npc0RlbnNpdHlSYW5nZSxcclxuICAgICAgcmFuZ2U6IHZhbHVlcy5jaGFzc2lzTWluRGVuc2l0eSxcclxuICAgICAgZmFjdG9yOiAxLFxyXG4gICAgfSxcclxuICAgIHZlcnRleF9saXN0OiB7XHJcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcclxuICAgICAgbGVuZ3RoOiAxMixcclxuICAgICAgbWluOiB2YWx1ZXMuY2hhc3Npc01pbkF4aXMsXHJcbiAgICAgIHJhbmdlOiB2YWx1ZXMuY2hhc3Npc0F4aXNSYW5nZSxcclxuICAgICAgZmFjdG9yOiAxLFxyXG4gICAgfSxcclxuICAgIHdoZWVsX3ZlcnRleDoge1xyXG4gICAgICB0eXBlOiBcInNodWZmbGVcIixcclxuICAgICAgbGVuZ3RoOiA4LFxyXG4gICAgICBsaW1pdDogdmFsdWVzLndoZWVsQ291bnQsXHJcbiAgICAgIGZhY3RvcjogMSxcclxuICAgIH0sXHJcbiAgfTtcclxufVxyXG4iLCIvKlxyXG4gIGdsb2JhbHMgYjJSZXZvbHV0ZUpvaW50RGVmIGIyVmVjMiBiMkJvZHlEZWYgYjJCb2R5IGIyRml4dHVyZURlZiBiMlBvbHlnb25TaGFwZSBiMkNpcmNsZVNoYXBlXHJcbiovXHJcblxyXG52YXIgY3JlYXRlSW5zdGFuY2UgPSByZXF1aXJlKFwiLi4vbWFjaGluZS1sZWFybmluZy9jcmVhdGUtaW5zdGFuY2VcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGRlZlRvQ2FyO1xyXG5cclxuZnVuY3Rpb24gZGVmVG9DYXIobm9ybWFsX2RlZiwgd29ybGQsIGNvbnN0YW50cyl7XHJcbiAgdmFyIGNhcl9kZWYgPSBjcmVhdGVJbnN0YW5jZS5hcHBseVR5cGVzKGNvbnN0YW50cy5zY2hlbWEsIG5vcm1hbF9kZWYpXHJcbiAgdmFyIGluc3RhbmNlID0ge307XHJcbiAgaW5zdGFuY2UuY2hhc3NpcyA9IGNyZWF0ZUNoYXNzaXMoXHJcbiAgICB3b3JsZCwgY2FyX2RlZi52ZXJ0ZXhfbGlzdCwgY2FyX2RlZi5jaGFzc2lzX2RlbnNpdHlcclxuICApO1xyXG4gIHZhciBpO1xyXG5cclxuICB2YXIgd2hlZWxDb3VudCA9IGNhcl9kZWYud2hlZWxfcmFkaXVzLmxlbmd0aDtcclxuXHJcbiAgaW5zdGFuY2Uud2hlZWxzID0gW107XHJcbiAgZm9yIChpID0gMDsgaSA8IHdoZWVsQ291bnQ7IGkrKykge1xyXG4gICAgaW5zdGFuY2Uud2hlZWxzW2ldID0gY3JlYXRlV2hlZWwoXHJcbiAgICAgIHdvcmxkLFxyXG4gICAgICBjYXJfZGVmLndoZWVsX3JhZGl1c1tpXSxcclxuICAgICAgY2FyX2RlZi53aGVlbF9kZW5zaXR5W2ldXHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgdmFyIGNhcm1hc3MgPSBpbnN0YW5jZS5jaGFzc2lzLkdldE1hc3MoKTtcclxuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XHJcbiAgICBjYXJtYXNzICs9IGluc3RhbmNlLndoZWVsc1tpXS5HZXRNYXNzKCk7XHJcbiAgfVxyXG5cclxuICB2YXIgam9pbnRfZGVmID0gbmV3IGIyUmV2b2x1dGVKb2ludERlZigpO1xyXG5cclxuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XHJcbiAgICB2YXIgdG9ycXVlID0gY2FybWFzcyAqIC1jb25zdGFudHMuZ3Jhdml0eS55IC8gY2FyX2RlZi53aGVlbF9yYWRpdXNbaV07XHJcblxyXG4gICAgdmFyIHJhbmR2ZXJ0ZXggPSBpbnN0YW5jZS5jaGFzc2lzLnZlcnRleF9saXN0W2Nhcl9kZWYud2hlZWxfdmVydGV4W2ldXTtcclxuICAgIGpvaW50X2RlZi5sb2NhbEFuY2hvckEuU2V0KHJhbmR2ZXJ0ZXgueCwgcmFuZHZlcnRleC55KTtcclxuICAgIGpvaW50X2RlZi5sb2NhbEFuY2hvckIuU2V0KDAsIDApO1xyXG4gICAgam9pbnRfZGVmLm1heE1vdG9yVG9ycXVlID0gdG9ycXVlO1xyXG4gICAgam9pbnRfZGVmLm1vdG9yU3BlZWQgPSAtY29uc3RhbnRzLm1vdG9yU3BlZWQ7XHJcbiAgICBqb2ludF9kZWYuZW5hYmxlTW90b3IgPSB0cnVlO1xyXG4gICAgam9pbnRfZGVmLmJvZHlBID0gaW5zdGFuY2UuY2hhc3NpcztcclxuICAgIGpvaW50X2RlZi5ib2R5QiA9IGluc3RhbmNlLndoZWVsc1tpXTtcclxuICAgIHdvcmxkLkNyZWF0ZUpvaW50KGpvaW50X2RlZik7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gaW5zdGFuY2U7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZUNoYXNzaXMod29ybGQsIHZlcnRleHMsIGRlbnNpdHkpIHtcclxuXHJcbiAgdmFyIHZlcnRleF9saXN0ID0gbmV3IEFycmF5KCk7XHJcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKHZlcnRleHNbMF0sIDApKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1sxXSwgdmVydGV4c1syXSkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigwLCB2ZXJ0ZXhzWzNdKSk7XHJcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKC12ZXJ0ZXhzWzRdLCB2ZXJ0ZXhzWzVdKSk7XHJcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKC12ZXJ0ZXhzWzZdLCAwKSk7XHJcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKC12ZXJ0ZXhzWzddLCAtdmVydGV4c1s4XSkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigwLCAtdmVydGV4c1s5XSkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMih2ZXJ0ZXhzWzEwXSwgLXZlcnRleHNbMTFdKSk7XHJcblxyXG4gIHZhciBib2R5X2RlZiA9IG5ldyBiMkJvZHlEZWYoKTtcclxuICBib2R5X2RlZi50eXBlID0gYjJCb2R5LmIyX2R5bmFtaWNCb2R5O1xyXG4gIGJvZHlfZGVmLnBvc2l0aW9uLlNldCgwLjAsIDQuMCk7XHJcblxyXG4gIHZhciBib2R5ID0gd29ybGQuQ3JlYXRlQm9keShib2R5X2RlZik7XHJcblxyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzBdLCB2ZXJ0ZXhfbGlzdFsxXSwgZGVuc2l0eSk7XHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMV0sIHZlcnRleF9saXN0WzJdLCBkZW5zaXR5KTtcclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFsyXSwgdmVydGV4X2xpc3RbM10sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzNdLCB2ZXJ0ZXhfbGlzdFs0XSwgZGVuc2l0eSk7XHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNF0sIHZlcnRleF9saXN0WzVdLCBkZW5zaXR5KTtcclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFs1XSwgdmVydGV4X2xpc3RbNl0sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzZdLCB2ZXJ0ZXhfbGlzdFs3XSwgZGVuc2l0eSk7XHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbN10sIHZlcnRleF9saXN0WzBdLCBkZW5zaXR5KTtcclxuXHJcbiAgYm9keS52ZXJ0ZXhfbGlzdCA9IHZlcnRleF9saXN0O1xyXG5cclxuICByZXR1cm4gYm9keTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleDEsIHZlcnRleDIsIGRlbnNpdHkpIHtcclxuICB2YXIgdmVydGV4X2xpc3QgPSBuZXcgQXJyYXkoKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKHZlcnRleDEpO1xyXG4gIHZlcnRleF9saXN0LnB1c2godmVydGV4Mik7XHJcbiAgdmVydGV4X2xpc3QucHVzaChiMlZlYzIuTWFrZSgwLCAwKSk7XHJcbiAgdmFyIGZpeF9kZWYgPSBuZXcgYjJGaXh0dXJlRGVmKCk7XHJcbiAgZml4X2RlZi5zaGFwZSA9IG5ldyBiMlBvbHlnb25TaGFwZSgpO1xyXG4gIGZpeF9kZWYuZGVuc2l0eSA9IGRlbnNpdHk7XHJcbiAgZml4X2RlZi5mcmljdGlvbiA9IDEwO1xyXG4gIGZpeF9kZWYucmVzdGl0dXRpb24gPSAwLjI7XHJcbiAgZml4X2RlZi5maWx0ZXIuZ3JvdXBJbmRleCA9IC0xO1xyXG4gIGZpeF9kZWYuc2hhcGUuU2V0QXNBcnJheSh2ZXJ0ZXhfbGlzdCwgMyk7XHJcblxyXG4gIGJvZHkuQ3JlYXRlRml4dHVyZShmaXhfZGVmKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlV2hlZWwod29ybGQsIHJhZGl1cywgZGVuc2l0eSkge1xyXG4gIHZhciBib2R5X2RlZiA9IG5ldyBiMkJvZHlEZWYoKTtcclxuICBib2R5X2RlZi50eXBlID0gYjJCb2R5LmIyX2R5bmFtaWNCb2R5O1xyXG4gIGJvZHlfZGVmLnBvc2l0aW9uLlNldCgwLCAwKTtcclxuXHJcbiAgdmFyIGJvZHkgPSB3b3JsZC5DcmVhdGVCb2R5KGJvZHlfZGVmKTtcclxuXHJcbiAgdmFyIGZpeF9kZWYgPSBuZXcgYjJGaXh0dXJlRGVmKCk7XHJcbiAgZml4X2RlZi5zaGFwZSA9IG5ldyBiMkNpcmNsZVNoYXBlKHJhZGl1cyk7XHJcbiAgZml4X2RlZi5kZW5zaXR5ID0gZGVuc2l0eTtcclxuICBmaXhfZGVmLmZyaWN0aW9uID0gMTtcclxuICBmaXhfZGVmLnJlc3RpdHV0aW9uID0gMC4yO1xyXG4gIGZpeF9kZWYuZmlsdGVyLmdyb3VwSW5kZXggPSAtMTtcclxuXHJcbiAgYm9keS5DcmVhdGVGaXh0dXJlKGZpeF9kZWYpO1xyXG4gIHJldHVybiBib2R5O1xyXG59XHJcbiIsIlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgZ2V0SW5pdGlhbFN0YXRlOiBnZXRJbml0aWFsU3RhdGUsXHJcbiAgdXBkYXRlU3RhdGU6IHVwZGF0ZVN0YXRlLFxyXG4gIGdldFN0YXR1czogZ2V0U3RhdHVzLFxyXG4gIGNhbGN1bGF0ZVNjb3JlOiBjYWxjdWxhdGVTY29yZSxcclxufTtcclxuXHJcbmZ1bmN0aW9uIGdldEluaXRpYWxTdGF0ZSh3b3JsZF9kZWYpe1xyXG4gIHJldHVybiB7XHJcbiAgICBmcmFtZXM6IDAsXHJcbiAgICBoZWFsdGg6IHdvcmxkX2RlZi5tYXhfY2FyX2hlYWx0aCxcclxuICAgIG1heFBvc2l0aW9ueTogMCxcclxuICAgIG1pblBvc2l0aW9ueTogMCxcclxuICAgIG1heFBvc2l0aW9ueDogMCxcclxuICB9O1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVTdGF0ZShjb25zdGFudHMsIHdvcmxkQ29uc3RydWN0LCBzdGF0ZSl7XHJcbiAgaWYoc3RhdGUuaGVhbHRoIDw9IDApe1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQWxyZWFkeSBEZWFkXCIpO1xyXG4gIH1cclxuICBpZihzdGF0ZS5tYXhQb3NpdGlvbnggPiBjb25zdGFudHMuZmluaXNoTGluZSl7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJhbHJlYWR5IEZpbmlzaGVkXCIpO1xyXG4gIH1cclxuXHJcbiAgLy8gY29uc29sZS5sb2coc3RhdGUpO1xyXG4gIC8vIGNoZWNrIGhlYWx0aFxyXG4gIHZhciBwb3NpdGlvbiA9IHdvcmxkQ29uc3RydWN0LmNoYXNzaXMuR2V0UG9zaXRpb24oKTtcclxuICAvLyBjaGVjayBpZiBjYXIgcmVhY2hlZCBlbmQgb2YgdGhlIHBhdGhcclxuICB2YXIgbmV4dFN0YXRlID0ge1xyXG4gICAgZnJhbWVzOiBzdGF0ZS5mcmFtZXMgKyAxLFxyXG4gICAgbWF4UG9zaXRpb254OiBwb3NpdGlvbi54ID4gc3RhdGUubWF4UG9zaXRpb254ID8gcG9zaXRpb24ueCA6IHN0YXRlLm1heFBvc2l0aW9ueCxcclxuICAgIG1heFBvc2l0aW9ueTogcG9zaXRpb24ueSA+IHN0YXRlLm1heFBvc2l0aW9ueSA/IHBvc2l0aW9uLnkgOiBzdGF0ZS5tYXhQb3NpdGlvbnksXHJcbiAgICBtaW5Qb3NpdGlvbnk6IHBvc2l0aW9uLnkgPCBzdGF0ZS5taW5Qb3NpdGlvbnkgPyBwb3NpdGlvbi55IDogc3RhdGUubWluUG9zaXRpb255XHJcbiAgfTtcclxuXHJcbiAgaWYgKHBvc2l0aW9uLnggPiBjb25zdGFudHMuZmluaXNoTGluZSkge1xyXG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcclxuICB9XHJcblxyXG4gIGlmIChwb3NpdGlvbi54ID4gc3RhdGUubWF4UG9zaXRpb254ICsgMC4wMikge1xyXG4gICAgbmV4dFN0YXRlLmhlYWx0aCA9IGNvbnN0YW50cy5tYXhfY2FyX2hlYWx0aDtcclxuICAgIHJldHVybiBuZXh0U3RhdGU7XHJcbiAgfVxyXG4gIG5leHRTdGF0ZS5oZWFsdGggPSBzdGF0ZS5oZWFsdGggLSAxO1xyXG4gIGlmIChNYXRoLmFicyh3b3JsZENvbnN0cnVjdC5jaGFzc2lzLkdldExpbmVhclZlbG9jaXR5KCkueCkgPCAwLjAwMSkge1xyXG4gICAgbmV4dFN0YXRlLmhlYWx0aCAtPSA1O1xyXG4gIH1cclxuICByZXR1cm4gbmV4dFN0YXRlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnZXRTdGF0dXMoc3RhdGUsIGNvbnN0YW50cyl7XHJcbiAgaWYoaGFzRmFpbGVkKHN0YXRlLCBjb25zdGFudHMpKSByZXR1cm4gLTE7XHJcbiAgaWYoaGFzU3VjY2VzcyhzdGF0ZSwgY29uc3RhbnRzKSkgcmV0dXJuIDE7XHJcbiAgcmV0dXJuIDA7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhc0ZhaWxlZChzdGF0ZSAvKiwgY29uc3RhbnRzICovKXtcclxuICByZXR1cm4gc3RhdGUuaGVhbHRoIDw9IDA7XHJcbn1cclxuZnVuY3Rpb24gaGFzU3VjY2VzcyhzdGF0ZSwgY29uc3RhbnRzKXtcclxuICByZXR1cm4gc3RhdGUubWF4UG9zaXRpb254ID4gY29uc3RhbnRzLmZpbmlzaExpbmU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNhbGN1bGF0ZVNjb3JlKHN0YXRlLCBjb25zdGFudHMpe1xyXG4gIHZhciBhdmdzcGVlZCA9IChzdGF0ZS5tYXhQb3NpdGlvbnggLyBzdGF0ZS5mcmFtZXMpICogY29uc3RhbnRzLmJveDJkZnBzO1xyXG4gIHZhciBwb3NpdGlvbiA9IHN0YXRlLm1heFBvc2l0aW9ueDtcclxuICB2YXIgc2NvcmUgPSBwb3NpdGlvbiArIGF2Z3NwZWVkO1xyXG4gIHJldHVybiB7XHJcbiAgICB2OiBzY29yZSxcclxuICAgIHM6IGF2Z3NwZWVkLFxyXG4gICAgeDogcG9zaXRpb24sXHJcbiAgICB5OiBzdGF0ZS5tYXhQb3NpdGlvbnksXHJcbiAgICB5Mjogc3RhdGUubWluUG9zaXRpb255XHJcbiAgfVxyXG59XHJcbiIsIi8qIGdsb2JhbHMgZG9jdW1lbnQgKi9cclxuXHJcbnZhciBydW4gPSByZXF1aXJlKFwiLi4vY2FyLXNjaGVtYS9ydW5cIik7XHJcblxyXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbi8qID09PSBDYXIgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxudmFyIGN3X0NhciA9IGZ1bmN0aW9uICgpIHtcclxuICB0aGlzLl9fY29uc3RydWN0b3IuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxufVxyXG5cclxuY3dfQ2FyLnByb3RvdHlwZS5fX2NvbnN0cnVjdG9yID0gZnVuY3Rpb24gKGNhcikge1xyXG4gIHRoaXMuY2FyID0gY2FyO1xyXG4gIHRoaXMuY2FyX2RlZiA9IGNhci5kZWY7XHJcbiAgdmFyIGNhcl9kZWYgPSB0aGlzLmNhcl9kZWY7XHJcblxyXG4gIHRoaXMuZnJhbWVzID0gMDtcclxuICB0aGlzLmFsaXZlID0gdHJ1ZTtcclxuICB0aGlzLmlzX2VsaXRlID0gY2FyLmRlZi5pc19lbGl0ZTtcclxuICB0aGlzLmhlYWx0aEJhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaGVhbHRoXCIgKyBjYXJfZGVmLmluZGV4KS5zdHlsZTtcclxuICB0aGlzLmhlYWx0aEJhclRleHQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImhlYWx0aFwiICsgY2FyX2RlZi5pbmRleCkubmV4dFNpYmxpbmcubmV4dFNpYmxpbmc7XHJcbiAgdGhpcy5oZWFsdGhCYXJUZXh0LmlubmVySFRNTCA9IGNhcl9kZWYuaW5kZXg7XHJcbiAgdGhpcy5taW5pbWFwbWFya2VyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJiYXJcIiArIGNhcl9kZWYuaW5kZXgpO1xyXG5cclxuICBpZiAodGhpcy5pc19lbGl0ZSkge1xyXG4gICAgdGhpcy5oZWFsdGhCYXIuYmFja2dyb3VuZENvbG9yID0gXCIjM0Y3MkFGXCI7XHJcbiAgICB0aGlzLm1pbmltYXBtYXJrZXIuc3R5bGUuYm9yZGVyTGVmdCA9IFwiMXB4IHNvbGlkICMzRjcyQUZcIjtcclxuICAgIHRoaXMubWluaW1hcG1hcmtlci5pbm5lckhUTUwgPSBjYXJfZGVmLmluZGV4O1xyXG4gIH0gZWxzZSB7XHJcbiAgICB0aGlzLmhlYWx0aEJhci5iYWNrZ3JvdW5kQ29sb3IgPSBcIiNGN0M4NzNcIjtcclxuICAgIHRoaXMubWluaW1hcG1hcmtlci5zdHlsZS5ib3JkZXJMZWZ0ID0gXCIxcHggc29saWQgI0Y3Qzg3M1wiO1xyXG4gICAgdGhpcy5taW5pbWFwbWFya2VyLmlubmVySFRNTCA9IGNhcl9kZWYuaW5kZXg7XHJcbiAgfVxyXG5cclxufVxyXG5cclxuY3dfQ2FyLnByb3RvdHlwZS5nZXRQb3NpdGlvbiA9IGZ1bmN0aW9uICgpIHtcclxuICByZXR1cm4gdGhpcy5jYXIuY2FyLmNoYXNzaXMuR2V0UG9zaXRpb24oKTtcclxufVxyXG5cclxuY3dfQ2FyLnByb3RvdHlwZS5raWxsID0gZnVuY3Rpb24gKGN1cnJlbnRSdW5uZXIsIGNvbnN0YW50cykge1xyXG4gIHRoaXMubWluaW1hcG1hcmtlci5zdHlsZS5ib3JkZXJMZWZ0ID0gXCIxcHggc29saWQgIzNGNzJBRlwiO1xyXG4gIHZhciBmaW5pc2hMaW5lID0gY3VycmVudFJ1bm5lci5zY2VuZS5maW5pc2hMaW5lXHJcbiAgdmFyIG1heF9jYXJfaGVhbHRoID0gY29uc3RhbnRzLm1heF9jYXJfaGVhbHRoO1xyXG4gIHZhciBzdGF0dXMgPSBydW4uZ2V0U3RhdHVzKHRoaXMuY2FyLnN0YXRlLCB7XHJcbiAgICBmaW5pc2hMaW5lOiBmaW5pc2hMaW5lLFxyXG4gICAgbWF4X2Nhcl9oZWFsdGg6IG1heF9jYXJfaGVhbHRoLFxyXG4gIH0pXHJcbiAgc3dpdGNoKHN0YXR1cyl7XHJcbiAgICBjYXNlIDE6IHtcclxuICAgICAgdGhpcy5oZWFsdGhCYXIud2lkdGggPSBcIjBcIjtcclxuICAgICAgYnJlYWtcclxuICAgIH1cclxuICAgIGNhc2UgLTE6IHtcclxuICAgICAgdGhpcy5oZWFsdGhCYXJUZXh0LmlubmVySFRNTCA9IFwiJmRhZ2dlcjtcIjtcclxuICAgICAgdGhpcy5oZWFsdGhCYXIud2lkdGggPSBcIjBcIjtcclxuICAgICAgYnJlYWtcclxuICAgIH1cclxuICB9XHJcbiAgdGhpcy5hbGl2ZSA9IGZhbHNlO1xyXG5cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBjd19DYXI7XHJcbiIsIlxyXG52YXIgY3dfZHJhd1ZpcnR1YWxQb2x5ID0gcmVxdWlyZShcIi4vZHJhdy12aXJ0dWFsLXBvbHlcIik7XHJcbnZhciBjd19kcmF3Q2lyY2xlID0gcmVxdWlyZShcIi4vZHJhdy1jaXJjbGVcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGNhcl9jb25zdGFudHMsIG15Q2FyLCBjYW1lcmEsIGN0eCl7XHJcbiAgdmFyIGNhbWVyYV94ID0gY2FtZXJhLnBvcy54O1xyXG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XHJcblxyXG4gIHZhciB3aGVlbE1pbkRlbnNpdHkgPSBjYXJfY29uc3RhbnRzLndoZWVsTWluRGVuc2l0eVxyXG4gIHZhciB3aGVlbERlbnNpdHlSYW5nZSA9IGNhcl9jb25zdGFudHMud2hlZWxEZW5zaXR5UmFuZ2VcclxuXHJcbiAgaWYgKCFteUNhci5hbGl2ZSkge1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICB2YXIgbXlDYXJQb3MgPSBteUNhci5nZXRQb3NpdGlvbigpO1xyXG5cclxuICBpZiAobXlDYXJQb3MueCA8IChjYW1lcmFfeCAtIDUpKSB7XHJcbiAgICAvLyB0b28gZmFyIGJlaGluZCwgZG9uJ3QgZHJhd1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuXHJcbiAgY3R4LnN0cm9rZVN0eWxlID0gXCIjNDQ0XCI7XHJcbiAgY3R4LmxpbmVXaWR0aCA9IDEgLyB6b29tO1xyXG5cclxuICB2YXIgd2hlZWxzID0gbXlDYXIuY2FyLmNhci53aGVlbHM7XHJcblxyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgd2hlZWxzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICB2YXIgYiA9IHdoZWVsc1tpXTtcclxuICAgIGZvciAodmFyIGYgPSBiLkdldEZpeHR1cmVMaXN0KCk7IGY7IGYgPSBmLm1fbmV4dCkge1xyXG4gICAgICB2YXIgcyA9IGYuR2V0U2hhcGUoKTtcclxuICAgICAgdmFyIGNvbG9yID0gTWF0aC5yb3VuZCgyNTUgLSAoMjU1ICogKGYubV9kZW5zaXR5IC0gd2hlZWxNaW5EZW5zaXR5KSkgLyB3aGVlbERlbnNpdHlSYW5nZSkudG9TdHJpbmcoKTtcclxuICAgICAgdmFyIHJnYmNvbG9yID0gXCJyZ2IoXCIgKyBjb2xvciArIFwiLFwiICsgY29sb3IgKyBcIixcIiArIGNvbG9yICsgXCIpXCI7XHJcbiAgICAgIGN3X2RyYXdDaXJjbGUoY3R4LCBiLCBzLm1fcCwgcy5tX3JhZGl1cywgYi5tX3N3ZWVwLmEsIHJnYmNvbG9yKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGlmIChteUNhci5pc19lbGl0ZSkge1xyXG4gICAgY3R4LnN0cm9rZVN0eWxlID0gXCIjM0Y3MkFGXCI7XHJcbiAgICBjdHguZmlsbFN0eWxlID0gXCIjREJFMkVGXCI7XHJcbiAgfSBlbHNlIHtcclxuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiI0Y3Qzg3M1wiO1xyXG4gICAgY3R4LmZpbGxTdHlsZSA9IFwiI0ZBRUJDRFwiO1xyXG4gIH1cclxuICBjdHguYmVnaW5QYXRoKCk7XHJcblxyXG4gIHZhciBjaGFzc2lzID0gbXlDYXIuY2FyLmNhci5jaGFzc2lzO1xyXG5cclxuICBmb3IgKGYgPSBjaGFzc2lzLkdldEZpeHR1cmVMaXN0KCk7IGY7IGYgPSBmLm1fbmV4dCkge1xyXG4gICAgdmFyIGNzID0gZi5HZXRTaGFwZSgpO1xyXG4gICAgY3dfZHJhd1ZpcnR1YWxQb2x5KGN0eCwgY2hhc3NpcywgY3MubV92ZXJ0aWNlcywgY3MubV92ZXJ0ZXhDb3VudCk7XHJcbiAgfVxyXG4gIGN0eC5maWxsKCk7XHJcbiAgY3R4LnN0cm9rZSgpO1xyXG59XHJcbiIsIlxyXG5tb2R1bGUuZXhwb3J0cyA9IGN3X2RyYXdDaXJjbGU7XHJcblxyXG5mdW5jdGlvbiBjd19kcmF3Q2lyY2xlKGN0eCwgYm9keSwgY2VudGVyLCByYWRpdXMsIGFuZ2xlLCBjb2xvcikge1xyXG4gIHZhciBwID0gYm9keS5HZXRXb3JsZFBvaW50KGNlbnRlcik7XHJcbiAgY3R4LmZpbGxTdHlsZSA9IGNvbG9yO1xyXG5cclxuICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgY3R4LmFyYyhwLngsIHAueSwgcmFkaXVzLCAwLCAyICogTWF0aC5QSSwgdHJ1ZSk7XHJcblxyXG4gIGN0eC5tb3ZlVG8ocC54LCBwLnkpO1xyXG4gIGN0eC5saW5lVG8ocC54ICsgcmFkaXVzICogTWF0aC5jb3MoYW5nbGUpLCBwLnkgKyByYWRpdXMgKiBNYXRoLnNpbihhbmdsZSkpO1xyXG5cclxuICBjdHguZmlsbCgpO1xyXG4gIGN0eC5zdHJva2UoKTtcclxufVxyXG4iLCJ2YXIgY3dfZHJhd1ZpcnR1YWxQb2x5ID0gcmVxdWlyZShcIi4vZHJhdy12aXJ0dWFsLXBvbHlcIik7XHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY3R4LCBjYW1lcmEsIGN3X2Zsb29yVGlsZXMpIHtcclxuICB2YXIgY2FtZXJhX3ggPSBjYW1lcmEucG9zLng7XHJcbiAgdmFyIHpvb20gPSBjYW1lcmEuem9vbTtcclxuICBjdHguc3Ryb2tlU3R5bGUgPSBcIiMwMDBcIjtcclxuICBjdHguZmlsbFN0eWxlID0gXCIjNzc3XCI7XHJcbiAgY3R4LmxpbmVXaWR0aCA9IDEgLyB6b29tO1xyXG4gIGN0eC5iZWdpblBhdGgoKTtcclxuXHJcbiAgdmFyIGs7XHJcbiAgaWYoY2FtZXJhLnBvcy54IC0gMTAgPiAwKXtcclxuICAgIGsgPSBNYXRoLmZsb29yKChjYW1lcmEucG9zLnggLSAxMCkgLyAxLjUpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBrID0gMDtcclxuICB9XHJcblxyXG4gIC8vIGNvbnNvbGUubG9nKGspO1xyXG5cclxuICBvdXRlcl9sb29wOlxyXG4gICAgZm9yIChrOyBrIDwgY3dfZmxvb3JUaWxlcy5sZW5ndGg7IGsrKykge1xyXG4gICAgICB2YXIgYiA9IGN3X2Zsb29yVGlsZXNba107XHJcbiAgICAgIGZvciAodmFyIGYgPSBiLkdldEZpeHR1cmVMaXN0KCk7IGY7IGYgPSBmLm1fbmV4dCkge1xyXG4gICAgICAgIHZhciBzID0gZi5HZXRTaGFwZSgpO1xyXG4gICAgICAgIHZhciBzaGFwZVBvc2l0aW9uID0gYi5HZXRXb3JsZFBvaW50KHMubV92ZXJ0aWNlc1swXSkueDtcclxuICAgICAgICBpZiAoKHNoYXBlUG9zaXRpb24gPiAoY2FtZXJhX3ggLSA1KSkgJiYgKHNoYXBlUG9zaXRpb24gPCAoY2FtZXJhX3ggKyAxMCkpKSB7XHJcbiAgICAgICAgICBjd19kcmF3VmlydHVhbFBvbHkoY3R4LCBiLCBzLm1fdmVydGljZXMsIHMubV92ZXJ0ZXhDb3VudCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChzaGFwZVBvc2l0aW9uID4gY2FtZXJhX3ggKyAxMCkge1xyXG4gICAgICAgICAgYnJlYWsgb3V0ZXJfbG9vcDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICBjdHguZmlsbCgpO1xyXG4gIGN0eC5zdHJva2UoKTtcclxufVxyXG4iLCJcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY3R4LCBib2R5LCB2dHgsIG5fdnR4KSB7XHJcbiAgLy8gc2V0IHN0cm9rZXN0eWxlIGFuZCBmaWxsc3R5bGUgYmVmb3JlIGNhbGxcclxuICAvLyBjYWxsIGJlZ2luUGF0aCBiZWZvcmUgY2FsbFxyXG5cclxuICB2YXIgcDAgPSBib2R5LkdldFdvcmxkUG9pbnQodnR4WzBdKTtcclxuICBjdHgubW92ZVRvKHAwLngsIHAwLnkpO1xyXG4gIGZvciAodmFyIGkgPSAxOyBpIDwgbl92dHg7IGkrKykge1xyXG4gICAgdmFyIHAgPSBib2R5LkdldFdvcmxkUG9pbnQodnR4W2ldKTtcclxuICAgIGN0eC5saW5lVG8ocC54LCBwLnkpO1xyXG4gIH1cclxuICBjdHgubGluZVRvKHAwLngsIHAwLnkpO1xyXG59XHJcbiIsInZhciBzY2F0dGVyUGxvdCA9IHJlcXVpcmUoXCIuL3NjYXR0ZXItcGxvdFwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG4gIHBsb3RHcmFwaHM6IGZ1bmN0aW9uKGdyYXBoRWxlbSwgdG9wU2NvcmVzRWxlbSwgc2NhdHRlclBsb3RFbGVtLCBsYXN0U3RhdGUsIHNjb3JlcywgY29uZmlnKSB7XHJcbiAgICBsYXN0U3RhdGUgPSBsYXN0U3RhdGUgfHwge307XHJcbiAgICB2YXIgZ2VuZXJhdGlvblNpemUgPSBzY29yZXMubGVuZ3RoXHJcbiAgICB2YXIgZ3JhcGhjYW52YXMgPSBncmFwaEVsZW07XHJcbiAgICB2YXIgZ3JhcGhjdHggPSBncmFwaGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcbiAgICB2YXIgZ3JhcGh3aWR0aCA9IDQwMDtcclxuICAgIHZhciBncmFwaGhlaWdodCA9IDI1MDtcclxuICAgIHZhciBuZXh0U3RhdGUgPSBjd19zdG9yZUdyYXBoU2NvcmVzKFxyXG4gICAgICBsYXN0U3RhdGUsIHNjb3JlcywgZ2VuZXJhdGlvblNpemVcclxuICAgICk7XHJcbiAgICBjb25zb2xlLmxvZyhzY29yZXMsIG5leHRTdGF0ZSk7XHJcbiAgICBjd19jbGVhckdyYXBoaWNzKGdyYXBoY2FudmFzLCBncmFwaGN0eCwgZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQpO1xyXG4gICAgY3dfcGxvdEF2ZXJhZ2UobmV4dFN0YXRlLCBncmFwaGN0eCk7XHJcbiAgICBjd19wbG90RWxpdGUobmV4dFN0YXRlLCBncmFwaGN0eCk7XHJcbiAgICBjd19wbG90VG9wKG5leHRTdGF0ZSwgZ3JhcGhjdHgpO1xyXG4gICAgY3dfbGlzdFRvcFNjb3Jlcyh0b3BTY29yZXNFbGVtLCBuZXh0U3RhdGUpO1xyXG4gICAgbmV4dFN0YXRlLnNjYXR0ZXJHcmFwaCA9IGRyYXdBbGxSZXN1bHRzKFxyXG4gICAgICBzY2F0dGVyUGxvdEVsZW0sIGNvbmZpZywgbmV4dFN0YXRlLCBsYXN0U3RhdGUuc2NhdHRlckdyYXBoXHJcbiAgICApO1xyXG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcclxuICB9LFxyXG4gIGNsZWFyR3JhcGhpY3M6IGZ1bmN0aW9uKGdyYXBoRWxlbSkge1xyXG4gICAgdmFyIGdyYXBoY2FudmFzID0gZ3JhcGhFbGVtO1xyXG4gICAgdmFyIGdyYXBoY3R4ID0gZ3JhcGhjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG4gICAgdmFyIGdyYXBod2lkdGggPSA0MDA7XHJcbiAgICB2YXIgZ3JhcGhoZWlnaHQgPSAyNTA7XHJcbiAgICBjd19jbGVhckdyYXBoaWNzKGdyYXBoY2FudmFzLCBncmFwaGN0eCwgZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQpO1xyXG4gIH1cclxufTtcclxuXHJcblxyXG5mdW5jdGlvbiBjd19zdG9yZUdyYXBoU2NvcmVzKGxhc3RTdGF0ZSwgY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSkge1xyXG4gIGNvbnNvbGUubG9nKGN3X2NhclNjb3Jlcyk7XHJcbiAgcmV0dXJuIHtcclxuICAgIGN3X3RvcFNjb3JlczogKGxhc3RTdGF0ZS5jd190b3BTY29yZXMgfHwgW10pXHJcbiAgICAuY29uY2F0KFtjd19jYXJTY29yZXNbMF0uc2NvcmVdKSxcclxuICAgIGN3X2dyYXBoQXZlcmFnZTogKGxhc3RTdGF0ZS5jd19ncmFwaEF2ZXJhZ2UgfHwgW10pLmNvbmNhdChbXHJcbiAgICAgIGN3X2F2ZXJhZ2UoY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSlcclxuICAgIF0pLFxyXG4gICAgY3dfZ3JhcGhFbGl0ZTogKGxhc3RTdGF0ZS5jd19ncmFwaEVsaXRlIHx8IFtdKS5jb25jYXQoW1xyXG4gICAgICBjd19lbGl0ZWF2ZXJhZ2UoY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSlcclxuICAgIF0pLFxyXG4gICAgY3dfZ3JhcGhUb3A6IChsYXN0U3RhdGUuY3dfZ3JhcGhUb3AgfHwgW10pLmNvbmNhdChbXHJcbiAgICAgIGN3X2NhclNjb3Jlc1swXS5zY29yZS52XHJcbiAgICBdKSxcclxuICAgIGFsbFJlc3VsdHM6IChsYXN0U3RhdGUuYWxsUmVzdWx0cyB8fCBbXSkuY29uY2F0KGN3X2NhclNjb3JlcyksXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjd19wbG90VG9wKHN0YXRlLCBncmFwaGN0eCkge1xyXG4gIHZhciBjd19ncmFwaFRvcCA9IHN0YXRlLmN3X2dyYXBoVG9wO1xyXG4gIHZhciBncmFwaHNpemUgPSBjd19ncmFwaFRvcC5sZW5ndGg7XHJcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiNDODNCM0JcIjtcclxuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgMCk7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xyXG4gICAgZ3JhcGhjdHgubGluZVRvKDQwMCAqIChrICsgMSkgLyBncmFwaHNpemUsIGN3X2dyYXBoVG9wW2tdKTtcclxuICB9XHJcbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3Bsb3RFbGl0ZShzdGF0ZSwgZ3JhcGhjdHgpIHtcclxuICB2YXIgY3dfZ3JhcGhFbGl0ZSA9IHN0YXRlLmN3X2dyYXBoRWxpdGU7XHJcbiAgdmFyIGdyYXBoc2l6ZSA9IGN3X2dyYXBoRWxpdGUubGVuZ3RoO1xyXG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjN0JDNzREXCI7XHJcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XHJcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIDApO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ3JhcGhzaXplOyBrKyspIHtcclxuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaEVsaXRlW2tdKTtcclxuICB9XHJcbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3Bsb3RBdmVyYWdlKHN0YXRlLCBncmFwaGN0eCkge1xyXG4gIHZhciBjd19ncmFwaEF2ZXJhZ2UgPSBzdGF0ZS5jd19ncmFwaEF2ZXJhZ2U7XHJcbiAgdmFyIGdyYXBoc2l6ZSA9IGN3X2dyYXBoQXZlcmFnZS5sZW5ndGg7XHJcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcclxuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgMCk7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xyXG4gICAgZ3JhcGhjdHgubGluZVRvKDQwMCAqIChrICsgMSkgLyBncmFwaHNpemUsIGN3X2dyYXBoQXZlcmFnZVtrXSk7XHJcbiAgfVxyXG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gY3dfZWxpdGVhdmVyYWdlKHNjb3JlcywgZ2VuZXJhdGlvblNpemUpIHtcclxuICB2YXIgc3VtID0gMDtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IE1hdGguZmxvb3IoZ2VuZXJhdGlvblNpemUgLyAyKTsgaysrKSB7XHJcbiAgICBzdW0gKz0gc2NvcmVzW2tdLnNjb3JlLnY7XHJcbiAgfVxyXG4gIHJldHVybiBzdW0gLyBNYXRoLmZsb29yKGdlbmVyYXRpb25TaXplIC8gMik7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2F2ZXJhZ2Uoc2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSkge1xyXG4gIHZhciBzdW0gPSAwO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xyXG4gICAgc3VtICs9IHNjb3Jlc1trXS5zY29yZS52O1xyXG4gIH1cclxuICByZXR1cm4gc3VtIC8gZ2VuZXJhdGlvblNpemU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2NsZWFyR3JhcGhpY3MoZ3JhcGhjYW52YXMsIGdyYXBoY3R4LCBncmFwaHdpZHRoLCBncmFwaGhlaWdodCkge1xyXG4gIGdyYXBoY2FudmFzLndpZHRoID0gZ3JhcGhjYW52YXMud2lkdGg7XHJcbiAgZ3JhcGhjdHgudHJhbnNsYXRlKDAsIGdyYXBoaGVpZ2h0KTtcclxuICBncmFwaGN0eC5zY2FsZSgxLCAtMSk7XHJcbiAgZ3JhcGhjdHgubGluZVdpZHRoID0gMTtcclxuICBncmFwaGN0eC5zdHJva2VTdHlsZSA9IFwiIzNGNzJBRlwiO1xyXG4gIGdyYXBoY3R4LmJlZ2luUGF0aCgpO1xyXG4gIGdyYXBoY3R4Lm1vdmVUbygwLCBncmFwaGhlaWdodCAvIDIpO1xyXG4gIGdyYXBoY3R4LmxpbmVUbyhncmFwaHdpZHRoLCBncmFwaGhlaWdodCAvIDIpO1xyXG4gIGdyYXBoY3R4Lm1vdmVUbygwLCBncmFwaGhlaWdodCAvIDQpO1xyXG4gIGdyYXBoY3R4LmxpbmVUbyhncmFwaHdpZHRoLCBncmFwaGhlaWdodCAvIDQpO1xyXG4gIGdyYXBoY3R4Lm1vdmVUbygwLCBncmFwaGhlaWdodCAqIDMgLyA0KTtcclxuICBncmFwaGN0eC5saW5lVG8oZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQgKiAzIC8gNCk7XHJcbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2xpc3RUb3BTY29yZXMoZWxlbSwgc3RhdGUpIHtcclxuICB2YXIgY3dfdG9wU2NvcmVzID0gc3RhdGUuY3dfdG9wU2NvcmVzO1xyXG4gIHZhciB0cyA9IGVsZW07XHJcbiAgdHMuaW5uZXJIVE1MID0gXCI8Yj5Ub3AgU2NvcmVzOjwvYj48YnIgLz5cIjtcclxuICBjd190b3BTY29yZXMuc29ydChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgaWYgKGEudiA+IGIudikge1xyXG4gICAgICByZXR1cm4gLTFcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiAxXHJcbiAgICB9XHJcbiAgfSk7XHJcblxyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgTWF0aC5taW4oMTAsIGN3X3RvcFNjb3Jlcy5sZW5ndGgpOyBrKyspIHtcclxuICAgIHZhciB0b3BTY29yZSA9IGN3X3RvcFNjb3Jlc1trXTtcclxuICAgIC8vIGNvbnNvbGUubG9nKHRvcFNjb3JlKTtcclxuICAgIHZhciBuID0gXCIjXCIgKyAoayArIDEpICsgXCI6XCI7XHJcbiAgICB2YXIgc2NvcmUgPSBNYXRoLnJvdW5kKHRvcFNjb3JlLnYgKiAxMDApIC8gMTAwO1xyXG4gICAgdmFyIGRpc3RhbmNlID0gXCJkOlwiICsgTWF0aC5yb3VuZCh0b3BTY29yZS54ICogMTAwKSAvIDEwMDtcclxuICAgIHZhciB5cmFuZ2UgPSAgXCJoOlwiICsgTWF0aC5yb3VuZCh0b3BTY29yZS55MiAqIDEwMCkgLyAxMDAgKyBcIi9cIiArIE1hdGgucm91bmQodG9wU2NvcmUueSAqIDEwMCkgLyAxMDAgKyBcIm1cIjtcclxuICAgIHZhciBnZW4gPSBcIihHZW4gXCIgKyBjd190b3BTY29yZXNba10uaSArIFwiKVwiXHJcblxyXG4gICAgdHMuaW5uZXJIVE1MICs9ICBbbiwgc2NvcmUsIGRpc3RhbmNlLCB5cmFuZ2UsIGdlbl0uam9pbihcIiBcIikgKyBcIjxiciAvPlwiO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZHJhd0FsbFJlc3VsdHMoc2NhdHRlclBsb3RFbGVtLCBjb25maWcsIGFsbFJlc3VsdHMsIHByZXZpb3VzR3JhcGgpe1xyXG4gIGlmKCFzY2F0dGVyUGxvdEVsZW0pIHJldHVybjtcclxuICByZXR1cm4gc2NhdHRlclBsb3Qoc2NhdHRlclBsb3RFbGVtLCBhbGxSZXN1bHRzLCBjb25maWcucHJvcGVydHlNYXAsIHByZXZpb3VzR3JhcGgpXHJcbn1cclxuIiwiLyogZ2xvYmFscyB2aXMgSGlnaGNoYXJ0cyAqL1xyXG5cclxuLy8gQ2FsbGVkIHdoZW4gdGhlIFZpc3VhbGl6YXRpb24gQVBJIGlzIGxvYWRlZC5cclxuXHJcbm1vZHVsZS5leHBvcnRzID0gaGlnaENoYXJ0cztcclxuZnVuY3Rpb24gaGlnaENoYXJ0cyhlbGVtLCBzY29yZXMpe1xyXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoc2NvcmVzWzBdLmRlZik7XHJcbiAga2V5cyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uKGN1ckFycmF5LCBrZXkpe1xyXG4gICAgdmFyIGwgPSBzY29yZXNbMF0uZGVmW2tleV0ubGVuZ3RoO1xyXG4gICAgdmFyIHN1YkFycmF5ID0gW107XHJcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbDsgaSsrKXtcclxuICAgICAgc3ViQXJyYXkucHVzaChrZXkgKyBcIi5cIiArIGkpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGN1ckFycmF5LmNvbmNhdChzdWJBcnJheSk7XHJcbiAgfSwgW10pO1xyXG4gIGZ1bmN0aW9uIHJldHJpZXZlVmFsdWUob2JqLCBwYXRoKXtcclxuICAgIHJldHVybiBwYXRoLnNwbGl0KFwiLlwiKS5yZWR1Y2UoZnVuY3Rpb24oY3VyVmFsdWUsIGtleSl7XHJcbiAgICAgIHJldHVybiBjdXJWYWx1ZVtrZXldO1xyXG4gICAgfSwgb2JqKTtcclxuICB9XHJcblxyXG4gIHZhciBkYXRhT2JqID0gT2JqZWN0LmtleXMoc2NvcmVzKS5yZWR1Y2UoZnVuY3Rpb24oa3YsIHNjb3JlKXtcclxuICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpe1xyXG4gICAgICBrdltrZXldLmRhdGEucHVzaChbXHJcbiAgICAgICAgcmV0cmlldmVWYWx1ZShzY29yZS5kZWYsIGtleSksIHNjb3JlLnNjb3JlLnZcclxuICAgICAgXSlcclxuICAgIH0pXHJcbiAgICByZXR1cm4ga3Y7XHJcbiAgfSwga2V5cy5yZWR1Y2UoZnVuY3Rpb24oa3YsIGtleSl7XHJcbiAgICBrdltrZXldID0ge1xyXG4gICAgICBuYW1lOiBrZXksXHJcbiAgICAgIGRhdGE6IFtdLFxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGt2O1xyXG4gIH0sIHt9KSlcclxuICBIaWdoY2hhcnRzLmNoYXJ0KGVsZW0uaWQsIHtcclxuICAgICAgY2hhcnQ6IHtcclxuICAgICAgICAgIHR5cGU6ICdzY2F0dGVyJyxcclxuICAgICAgICAgIHpvb21UeXBlOiAneHknXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpdGxlOiB7XHJcbiAgICAgICAgICB0ZXh0OiAnUHJvcGVydHkgVmFsdWUgdG8gU2NvcmUnXHJcbiAgICAgIH0sXHJcbiAgICAgIHhBeGlzOiB7XHJcbiAgICAgICAgICB0aXRsZToge1xyXG4gICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgICAgICAgdGV4dDogJ05vcm1hbGl6ZWQnXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgc3RhcnRPblRpY2s6IHRydWUsXHJcbiAgICAgICAgICBlbmRPblRpY2s6IHRydWUsXHJcbiAgICAgICAgICBzaG93TGFzdExhYmVsOiB0cnVlXHJcbiAgICAgIH0sXHJcbiAgICAgIHlBeGlzOiB7XHJcbiAgICAgICAgICB0aXRsZToge1xyXG4gICAgICAgICAgICAgIHRleHQ6ICdTY29yZSdcclxuICAgICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgbGVnZW5kOiB7XHJcbiAgICAgICAgICBsYXlvdXQ6ICd2ZXJ0aWNhbCcsXHJcbiAgICAgICAgICBhbGlnbjogJ2xlZnQnLFxyXG4gICAgICAgICAgdmVydGljYWxBbGlnbjogJ3RvcCcsXHJcbiAgICAgICAgICB4OiAxMDAsXHJcbiAgICAgICAgICB5OiA3MCxcclxuICAgICAgICAgIGZsb2F0aW5nOiB0cnVlLFxyXG4gICAgICAgICAgYmFja2dyb3VuZENvbG9yOiAoSGlnaGNoYXJ0cy50aGVtZSAmJiBIaWdoY2hhcnRzLnRoZW1lLmxlZ2VuZEJhY2tncm91bmRDb2xvcikgfHwgJyNGRkZGRkYnLFxyXG4gICAgICAgICAgYm9yZGVyV2lkdGg6IDFcclxuICAgICAgfSxcclxuICAgICAgcGxvdE9wdGlvbnM6IHtcclxuICAgICAgICAgIHNjYXR0ZXI6IHtcclxuICAgICAgICAgICAgICBtYXJrZXI6IHtcclxuICAgICAgICAgICAgICAgICAgcmFkaXVzOiA1LFxyXG4gICAgICAgICAgICAgICAgICBzdGF0ZXM6IHtcclxuICAgICAgICAgICAgICAgICAgICAgIGhvdmVyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBsaW5lQ29sb3I6ICdyZ2IoMTAwLDEwMCwxMDApJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICBzdGF0ZXM6IHtcclxuICAgICAgICAgICAgICAgICAgaG92ZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgIG1hcmtlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGVuYWJsZWQ6IGZhbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIHRvb2x0aXA6IHtcclxuICAgICAgICAgICAgICAgICAgaGVhZGVyRm9ybWF0OiAnPGI+e3Nlcmllcy5uYW1lfTwvYj48YnI+JyxcclxuICAgICAgICAgICAgICAgICAgcG9pbnRGb3JtYXQ6ICd7cG9pbnQueH0sIHtwb2ludC55fSdcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIHNlcmllczoga2V5cy5tYXAoZnVuY3Rpb24oa2V5KXtcclxuICAgICAgICByZXR1cm4gZGF0YU9ialtrZXldO1xyXG4gICAgICB9KVxyXG4gIH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiB2aXNDaGFydChlbGVtLCBzY29yZXMsIHByb3BlcnR5TWFwLCBncmFwaCkge1xyXG5cclxuICAvLyBDcmVhdGUgYW5kIHBvcHVsYXRlIGEgZGF0YSB0YWJsZS5cclxuICB2YXIgZGF0YSA9IG5ldyB2aXMuRGF0YVNldCgpO1xyXG4gIHNjb3Jlcy5mb3JFYWNoKGZ1bmN0aW9uKHNjb3JlSW5mbyl7XHJcbiAgICBkYXRhLmFkZCh7XHJcbiAgICAgIHg6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueCksXHJcbiAgICAgIHk6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueCksXHJcbiAgICAgIHo6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueiksXHJcbiAgICAgIHN0eWxlOiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLnopLFxyXG4gICAgICAvLyBleHRyYTogZGVmLmFuY2VzdHJ5XHJcbiAgICB9KTtcclxuICB9KTtcclxuXHJcbiAgZnVuY3Rpb24gZ2V0UHJvcGVydHkoaW5mbywga2V5KXtcclxuICAgIGlmKGtleSA9PT0gXCJzY29yZVwiKXtcclxuICAgICAgcmV0dXJuIGluZm8uc2NvcmUudlxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIGluZm8uZGVmW2tleV07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBzcGVjaWZ5IG9wdGlvbnNcclxuICB2YXIgb3B0aW9ucyA9IHtcclxuICAgIHdpZHRoOiAgJzYwMHB4JyxcclxuICAgIGhlaWdodDogJzYwMHB4JyxcclxuICAgIHN0eWxlOiAnZG90LXNpemUnLFxyXG4gICAgc2hvd1BlcnNwZWN0aXZlOiB0cnVlLFxyXG4gICAgc2hvd0xlZ2VuZDogdHJ1ZSxcclxuICAgIHNob3dHcmlkOiB0cnVlLFxyXG4gICAgc2hvd1NoYWRvdzogZmFsc2UsXHJcblxyXG4gICAgLy8gT3B0aW9uIHRvb2x0aXAgY2FuIGJlIHRydWUsIGZhbHNlLCBvciBhIGZ1bmN0aW9uIHJldHVybmluZyBhIHN0cmluZyB3aXRoIEhUTUwgY29udGVudHNcclxuICAgIHRvb2x0aXA6IGZ1bmN0aW9uIChwb2ludCkge1xyXG4gICAgICAvLyBwYXJhbWV0ZXIgcG9pbnQgY29udGFpbnMgcHJvcGVydGllcyB4LCB5LCB6LCBhbmQgZGF0YVxyXG4gICAgICAvLyBkYXRhIGlzIHRoZSBvcmlnaW5hbCBvYmplY3QgcGFzc2VkIHRvIHRoZSBwb2ludCBjb25zdHJ1Y3RvclxyXG4gICAgICByZXR1cm4gJ3Njb3JlOiA8Yj4nICsgcG9pbnQueiArICc8L2I+PGJyPic7IC8vICsgcG9pbnQuZGF0YS5leHRyYTtcclxuICAgIH0sXHJcblxyXG4gICAgLy8gVG9vbHRpcCBkZWZhdWx0IHN0eWxpbmcgY2FuIGJlIG92ZXJyaWRkZW5cclxuICAgIHRvb2x0aXBTdHlsZToge1xyXG4gICAgICBjb250ZW50OiB7XHJcbiAgICAgICAgYmFja2dyb3VuZCAgICA6ICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNyknLFxyXG4gICAgICAgIHBhZGRpbmcgICAgICAgOiAnMTBweCcsXHJcbiAgICAgICAgYm9yZGVyUmFkaXVzICA6ICcxMHB4J1xyXG4gICAgICB9LFxyXG4gICAgICBsaW5lOiB7XHJcbiAgICAgICAgYm9yZGVyTGVmdCAgICA6ICcxcHggZG90dGVkIHJnYmEoMCwgMCwgMCwgMC41KSdcclxuICAgICAgfSxcclxuICAgICAgZG90OiB7XHJcbiAgICAgICAgYm9yZGVyICAgICAgICA6ICc1cHggc29saWQgcmdiYSgwLCAwLCAwLCAwLjUpJ1xyXG4gICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGtlZXBBc3BlY3RSYXRpbzogdHJ1ZSxcclxuICAgIHZlcnRpY2FsUmF0aW86IDAuNVxyXG4gIH07XHJcblxyXG4gIHZhciBjYW1lcmEgPSBncmFwaCA/IGdyYXBoLmdldENhbWVyYVBvc2l0aW9uKCkgOiBudWxsO1xyXG5cclxuICAvLyBjcmVhdGUgb3VyIGdyYXBoXHJcbiAgdmFyIGNvbnRhaW5lciA9IGVsZW07XHJcbiAgZ3JhcGggPSBuZXcgdmlzLkdyYXBoM2QoY29udGFpbmVyLCBkYXRhLCBvcHRpb25zKTtcclxuXHJcbiAgaWYgKGNhbWVyYSkgZ3JhcGguc2V0Q2FtZXJhUG9zaXRpb24oY2FtZXJhKTsgLy8gcmVzdG9yZSBjYW1lcmEgcG9zaXRpb25cclxuICByZXR1cm4gZ3JhcGg7XHJcbn1cclxuIiwiXHJcbm1vZHVsZS5leHBvcnRzID0gZ2VuZXJhdGVSYW5kb207XHJcbmZ1bmN0aW9uIGdlbmVyYXRlUmFuZG9tKCl7XHJcbiAgcmV0dXJuIE1hdGgucmFuZG9tKCk7XHJcbn1cclxuIiwiLy8gaHR0cDovL3N1bm1pbmd0YW8uYmxvZ3Nwb3QuY29tLzIwMTYvMTEvaW5icmVlZGluZy1jb2VmZmljaWVudC5odG1sXHJcbm1vZHVsZS5leHBvcnRzID0gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50O1xyXG5cclxuZnVuY3Rpb24gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50KGNoaWxkKXtcclxuICB2YXIgbmFtZUluZGV4ID0gbmV3IE1hcCgpO1xyXG4gIHZhciBmbGFnZ2VkID0gbmV3IFNldCgpO1xyXG4gIHZhciBjb252ZXJnZW5jZVBvaW50cyA9IG5ldyBTZXQoKTtcclxuICBjcmVhdGVBbmNlc3RyeU1hcChjaGlsZCwgW10pO1xyXG5cclxuICB2YXIgc3RvcmVkQ29lZmZpY2llbnRzID0gbmV3IE1hcCgpO1xyXG5cclxuICByZXR1cm4gQXJyYXkuZnJvbShjb252ZXJnZW5jZVBvaW50cy52YWx1ZXMoKSkucmVkdWNlKGZ1bmN0aW9uKHN1bSwgcG9pbnQpe1xyXG4gICAgdmFyIGlDbyA9IGdldENvZWZmaWNpZW50KHBvaW50KTtcclxuICAgIHJldHVybiBzdW0gKyBpQ287XHJcbiAgfSwgMCk7XHJcblxyXG4gIGZ1bmN0aW9uIGNyZWF0ZUFuY2VzdHJ5TWFwKGluaXROb2RlKXtcclxuICAgIHZhciBpdGVtc0luUXVldWUgPSBbeyBub2RlOiBpbml0Tm9kZSwgcGF0aDogW10gfV07XHJcbiAgICBkb3tcclxuICAgICAgdmFyIGl0ZW0gPSBpdGVtc0luUXVldWUuc2hpZnQoKTtcclxuICAgICAgdmFyIG5vZGUgPSBpdGVtLm5vZGU7XHJcbiAgICAgIHZhciBwYXRoID0gaXRlbS5wYXRoO1xyXG4gICAgICBpZihwcm9jZXNzSXRlbShub2RlLCBwYXRoKSl7XHJcbiAgICAgICAgdmFyIG5leHRQYXRoID0gWyBub2RlLmlkIF0uY29uY2F0KHBhdGgpO1xyXG4gICAgICAgIGl0ZW1zSW5RdWV1ZSA9IGl0ZW1zSW5RdWV1ZS5jb25jYXQobm9kZS5hbmNlc3RyeS5tYXAoZnVuY3Rpb24ocGFyZW50KXtcclxuICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIG5vZGU6IHBhcmVudCxcclxuICAgICAgICAgICAgcGF0aDogbmV4dFBhdGhcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgfSkpO1xyXG4gICAgICB9XHJcbiAgICB9d2hpbGUoaXRlbXNJblF1ZXVlLmxlbmd0aCk7XHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIHByb2Nlc3NJdGVtKG5vZGUsIHBhdGgpe1xyXG4gICAgICB2YXIgbmV3QW5jZXN0b3IgPSAhbmFtZUluZGV4Lmhhcyhub2RlLmlkKTtcclxuICAgICAgaWYobmV3QW5jZXN0b3Ipe1xyXG4gICAgICAgIG5hbWVJbmRleC5zZXQobm9kZS5pZCwge1xyXG4gICAgICAgICAgcGFyZW50czogKG5vZGUuYW5jZXN0cnkgfHwgW10pLm1hcChmdW5jdGlvbihwYXJlbnQpe1xyXG4gICAgICAgICAgICByZXR1cm4gcGFyZW50LmlkO1xyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgICBpZDogbm9kZS5pZCxcclxuICAgICAgICAgIGNoaWxkcmVuOiBbXSxcclxuICAgICAgICAgIGNvbnZlcmdlbmNlczogW10sXHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0gZWxzZSB7XHJcblxyXG4gICAgICAgIGZsYWdnZWQuYWRkKG5vZGUuaWQpXHJcbiAgICAgICAgbmFtZUluZGV4LmdldChub2RlLmlkKS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkSWRlbnRpZmllcil7XHJcbiAgICAgICAgICB2YXIgb2Zmc2V0cyA9IGZpbmRDb252ZXJnZW5jZShjaGlsZElkZW50aWZpZXIucGF0aCwgcGF0aCk7XHJcbiAgICAgICAgICBpZighb2Zmc2V0cyl7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHZhciBjaGlsZElEID0gcGF0aFtvZmZzZXRzWzFdXTtcclxuICAgICAgICAgIGNvbnZlcmdlbmNlUG9pbnRzLmFkZChjaGlsZElEKTtcclxuICAgICAgICAgIG5hbWVJbmRleC5nZXQoY2hpbGRJRCkuY29udmVyZ2VuY2VzLnB1c2goe1xyXG4gICAgICAgICAgICBwYXJlbnQ6IG5vZGUuaWQsXHJcbiAgICAgICAgICAgIG9mZnNldHM6IG9mZnNldHMsXHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYocGF0aC5sZW5ndGgpe1xyXG4gICAgICAgIG5hbWVJbmRleC5nZXQobm9kZS5pZCkuY2hpbGRyZW4ucHVzaCh7XHJcbiAgICAgICAgICBjaGlsZDogcGF0aFswXSxcclxuICAgICAgICAgIHBhdGg6IHBhdGhcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYoIW5ld0FuY2VzdG9yKXtcclxuICAgICAgICByZXR1cm47XHJcbiAgICAgIH1cclxuICAgICAgaWYoIW5vZGUuYW5jZXN0cnkpe1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGdldENvZWZmaWNpZW50KGlkKXtcclxuICAgIGlmKHN0b3JlZENvZWZmaWNpZW50cy5oYXMoaWQpKXtcclxuICAgICAgcmV0dXJuIHN0b3JlZENvZWZmaWNpZW50cy5nZXQoaWQpO1xyXG4gICAgfVxyXG4gICAgdmFyIG5vZGUgPSBuYW1lSW5kZXguZ2V0KGlkKTtcclxuICAgIHZhciB2YWwgPSBub2RlLmNvbnZlcmdlbmNlcy5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBwb2ludCl7XHJcbiAgICAgIHJldHVybiBzdW0gKyBNYXRoLnBvdygxIC8gMiwgcG9pbnQub2Zmc2V0cy5yZWR1Y2UoZnVuY3Rpb24oc3VtLCB2YWx1ZSl7XHJcbiAgICAgICAgcmV0dXJuIHN1bSArIHZhbHVlO1xyXG4gICAgICB9LCAxKSkgKiAoMSArIGdldENvZWZmaWNpZW50KHBvaW50LnBhcmVudCkpO1xyXG4gICAgfSwgMCk7XHJcbiAgICBzdG9yZWRDb2VmZmljaWVudHMuc2V0KGlkLCB2YWwpO1xyXG5cclxuICAgIHJldHVybiB2YWw7XHJcblxyXG4gIH1cclxuICBmdW5jdGlvbiBmaW5kQ29udmVyZ2VuY2UobGlzdEEsIGxpc3RCKXtcclxuICAgIHZhciBjaSwgY2osIGxpLCBsajtcclxuICAgIG91dGVybG9vcDpcclxuICAgIGZvcihjaSA9IDAsIGxpID0gbGlzdEEubGVuZ3RoOyBjaSA8IGxpOyBjaSsrKXtcclxuICAgICAgZm9yKGNqID0gMCwgbGogPSBsaXN0Qi5sZW5ndGg7IGNqIDwgbGo7IGNqKyspe1xyXG4gICAgICAgIGlmKGxpc3RBW2NpXSA9PT0gbGlzdEJbY2pdKXtcclxuICAgICAgICAgIGJyZWFrIG91dGVybG9vcDtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICAgIGlmKGNpID09PSBsaSl7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHJldHVybiBbY2ksIGNqXTtcclxuICB9XHJcbn1cclxuIiwidmFyIGNhckNvbnN0cnVjdCA9IHJlcXVpcmUoXCIuLi9jYXItc2NoZW1hL2NvbnN0cnVjdC5qc1wiKTtcclxuXHJcbnZhciBjYXJDb25zdGFudHMgPSBjYXJDb25zdHJ1Y3QuY2FyQ29uc3RhbnRzKCk7XHJcblxyXG52YXIgc2NoZW1hID0gY2FyQ29uc3RydWN0LmdlbmVyYXRlU2NoZW1hKGNhckNvbnN0YW50cyk7XHJcbnZhciBwaWNrUGFyZW50ID0gcmVxdWlyZShcIi4vcGlja1BhcmVudFwiKTtcclxudmFyIHNlbGVjdEZyb21BbGxQYXJlbnRzID0gcmVxdWlyZShcIi4vc2VsZWN0RnJvbUFsbFBhcmVudHNcIik7XHJcbmNvbnN0IGNvbnN0YW50cyA9IHtcclxuICBnZW5lcmF0aW9uU2l6ZTogMjAsXHJcbiAgc2NoZW1hOiBzY2hlbWEsXHJcbiAgY2hhbXBpb25MZW5ndGg6IDEsXHJcbiAgbXV0YXRpb25fcmFuZ2U6IDEsXHJcbiAgZ2VuX211dGF0aW9uOiAwLjA1LFxyXG59O1xyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCl7XHJcbiAgdmFyIGN1cnJlbnRDaG9pY2VzID0gbmV3IE1hcCgpO1xyXG4gIHJldHVybiBPYmplY3QuYXNzaWduKFxyXG4gICAge30sXHJcbiAgICBjb25zdGFudHMsXHJcbiAgICB7XHJcbiAgICAgIHNlbGVjdEZyb21BbGxQYXJlbnRzOiBzZWxlY3RGcm9tQWxsUGFyZW50cyxcclxuICAgICAgZ2VuZXJhdGVSYW5kb206IHJlcXVpcmUoXCIuL2dlbmVyYXRlUmFuZG9tXCIpLFxyXG4gICAgICBwaWNrUGFyZW50OiBwaWNrUGFyZW50LmJpbmQodm9pZCAwLCBjdXJyZW50Q2hvaWNlcyksXHJcbiAgICB9XHJcbiAgKTtcclxufVxyXG5tb2R1bGUuZXhwb3J0cy5jb25zdGFudHMgPSBjb25zdGFudHNcclxuIiwidmFyIG5BdHRyaWJ1dGVzID0gMTU7XHJcbm1vZHVsZS5leHBvcnRzID0gcGlja1BhcmVudDtcclxuXHJcbmZ1bmN0aW9uIHBpY2tQYXJlbnQoY3VycmVudENob2ljZXMsIGNob29zZUlkLCBrZXkgLyogLCBwYXJlbnRzICovKXtcclxuICBpZighY3VycmVudENob2ljZXMuaGFzKGNob29zZUlkKSl7XHJcbiAgICBjdXJyZW50Q2hvaWNlcy5zZXQoY2hvb3NlSWQsIGluaXRpYWxpemVQaWNrKCkpXHJcbiAgfVxyXG4gIC8vIGNvbnNvbGUubG9nKGNob29zZUlkKTtcclxuICB2YXIgc3RhdGUgPSBjdXJyZW50Q2hvaWNlcy5nZXQoY2hvb3NlSWQpO1xyXG4gIC8vIGNvbnNvbGUubG9nKHN0YXRlLmN1cnBhcmVudCk7XHJcbiAgc3RhdGUuaSsrXHJcbiAgaWYoW1wid2hlZWxfcmFkaXVzXCIsIFwid2hlZWxfdmVydGV4XCIsIFwid2hlZWxfZGVuc2l0eVwiXS5pbmRleE9mKGtleSkgPiAtMSl7XHJcbiAgICBzdGF0ZS5jdXJwYXJlbnQgPSBjd19jaG9vc2VQYXJlbnQoc3RhdGUpO1xyXG4gICAgcmV0dXJuIHN0YXRlLmN1cnBhcmVudDtcclxuICB9XHJcbiAgc3RhdGUuY3VycGFyZW50ID0gY3dfY2hvb3NlUGFyZW50KHN0YXRlKTtcclxuICByZXR1cm4gc3RhdGUuY3VycGFyZW50O1xyXG5cclxuICBmdW5jdGlvbiBjd19jaG9vc2VQYXJlbnQoc3RhdGUpIHtcclxuICAgIHZhciBjdXJwYXJlbnQgPSBzdGF0ZS5jdXJwYXJlbnQ7XHJcbiAgICB2YXIgYXR0cmlidXRlSW5kZXggPSBzdGF0ZS5pO1xyXG4gICAgdmFyIHN3YXBQb2ludDEgPSBzdGF0ZS5zd2FwUG9pbnQxXHJcbiAgICB2YXIgc3dhcFBvaW50MiA9IHN0YXRlLnN3YXBQb2ludDJcclxuICAgIC8vIGNvbnNvbGUubG9nKHN3YXBQb2ludDEsIHN3YXBQb2ludDIsIGF0dHJpYnV0ZUluZGV4KVxyXG4gICAgaWYgKChzd2FwUG9pbnQxID09IGF0dHJpYnV0ZUluZGV4KSB8fCAoc3dhcFBvaW50MiA9PSBhdHRyaWJ1dGVJbmRleCkpIHtcclxuICAgICAgcmV0dXJuIGN1cnBhcmVudCA9PSAxID8gMCA6IDFcclxuICAgIH1cclxuICAgIHJldHVybiBjdXJwYXJlbnRcclxuICB9XHJcblxyXG4gIGZ1bmN0aW9uIGluaXRpYWxpemVQaWNrKCl7XHJcbiAgICB2YXIgY3VycGFyZW50ID0gMDtcclxuXHJcbiAgICB2YXIgc3dhcFBvaW50MSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChuQXR0cmlidXRlcykpO1xyXG4gICAgdmFyIHN3YXBQb2ludDIgPSBzd2FwUG9pbnQxO1xyXG4gICAgd2hpbGUgKHN3YXBQb2ludDIgPT0gc3dhcFBvaW50MSkge1xyXG4gICAgICBzd2FwUG9pbnQyID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG5BdHRyaWJ1dGVzKSk7XHJcbiAgICB9XHJcbiAgICB2YXIgaSA9IDA7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBjdXJwYXJlbnQ6IGN1cnBhcmVudCxcclxuICAgICAgaTogaSxcclxuICAgICAgc3dhcFBvaW50MTogc3dhcFBvaW50MSxcclxuICAgICAgc3dhcFBvaW50Mjogc3dhcFBvaW50MlxyXG4gICAgfVxyXG4gIH1cclxufVxyXG4iLCJ2YXIgZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50ID0gcmVxdWlyZShcIi4vaW5icmVlZGluZy1jb2VmZmljaWVudFwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gc2ltcGxlU2VsZWN0O1xyXG5cclxuZnVuY3Rpb24gc2ltcGxlU2VsZWN0KHBhcmVudHMpe1xyXG4gIHZhciB0b3RhbFBhcmVudHMgPSBwYXJlbnRzLmxlbmd0aFxyXG4gIHZhciByID0gTWF0aC5yYW5kb20oKTtcclxuICBpZiAociA9PSAwKVxyXG4gICAgcmV0dXJuIDA7XHJcbiAgcmV0dXJuIE1hdGguZmxvb3IoLU1hdGgubG9nKHIpICogdG90YWxQYXJlbnRzKSAlIHRvdGFsUGFyZW50cztcclxufVxyXG5cclxuZnVuY3Rpb24gc2VsZWN0RnJvbUFsbFBhcmVudHMocGFyZW50cywgcGFyZW50TGlzdCwgcHJldmlvdXNQYXJlbnRJbmRleCkge1xyXG4gIHZhciBwcmV2aW91c1BhcmVudCA9IHBhcmVudHNbcHJldmlvdXNQYXJlbnRJbmRleF07XHJcbiAgdmFyIHZhbGlkUGFyZW50cyA9IHBhcmVudHMuZmlsdGVyKGZ1bmN0aW9uKHBhcmVudCwgaSl7XHJcbiAgICBpZihwcmV2aW91c1BhcmVudEluZGV4ID09PSBpKXtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgaWYoIXByZXZpb3VzUGFyZW50KXtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9XHJcbiAgICB2YXIgY2hpbGQgPSB7XHJcbiAgICAgIGlkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDMyKSxcclxuICAgICAgYW5jZXN0cnk6IFtwcmV2aW91c1BhcmVudCwgcGFyZW50XS5tYXAoZnVuY3Rpb24ocCl7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIGlkOiBwLmRlZi5pZCxcclxuICAgICAgICAgIGFuY2VzdHJ5OiBwLmRlZi5hbmNlc3RyeVxyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuICAgIH1cclxuICAgIHZhciBpQ28gPSBnZXRJbmJyZWVkaW5nQ29lZmZpY2llbnQoY2hpbGQpO1xyXG4gICAgY29uc29sZS5sb2coXCJpbmJyZWVkaW5nIGNvZWZmaWNpZW50XCIsIGlDbylcclxuICAgIGlmKGlDbyA+IDAuMjUpe1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxuICB9KVxyXG4gIGlmKHZhbGlkUGFyZW50cy5sZW5ndGggPT09IDApe1xyXG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHBhcmVudHMubGVuZ3RoKVxyXG4gIH1cclxuICB2YXIgdG90YWxTY29yZSA9IHZhbGlkUGFyZW50cy5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBwYXJlbnQpe1xyXG4gICAgcmV0dXJuIHN1bSArIHBhcmVudC5zY29yZS52O1xyXG4gIH0sIDApO1xyXG4gIHZhciByID0gdG90YWxTY29yZSAqIE1hdGgucmFuZG9tKCk7XHJcbiAgZm9yKHZhciBpID0gMDsgaSA8IHZhbGlkUGFyZW50cy5sZW5ndGg7IGkrKyl7XHJcbiAgICB2YXIgc2NvcmUgPSB2YWxpZFBhcmVudHNbaV0uc2NvcmUudjtcclxuICAgIGlmKHIgPiBzY29yZSl7XHJcbiAgICAgIHIgPSByIC0gc2NvcmU7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBicmVhaztcclxuICAgIH1cclxuICB9XHJcbiAgcmV0dXJuIGk7XHJcbn1cclxuIiwiXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY2FyKSB7XHJcbiAgdmFyIG91dCA9IHtcclxuICAgIGNoYXNzaXM6IGdob3N0X2dldF9jaGFzc2lzKGNhci5jaGFzc2lzKSxcclxuICAgIHdoZWVsczogW10sXHJcbiAgICBwb3M6IHt4OiBjYXIuY2hhc3Npcy5HZXRQb3NpdGlvbigpLngsIHk6IGNhci5jaGFzc2lzLkdldFBvc2l0aW9uKCkueX1cclxuICB9O1xyXG5cclxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNhci53aGVlbHMubGVuZ3RoOyBpKyspIHtcclxuICAgIG91dC53aGVlbHNbaV0gPSBnaG9zdF9nZXRfd2hlZWwoY2FyLndoZWVsc1tpXSk7XHJcbiAgfVxyXG5cclxuICByZXR1cm4gb3V0O1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9nZXRfY2hhc3NpcyhjKSB7XHJcbiAgdmFyIGdjID0gW107XHJcblxyXG4gIGZvciAodmFyIGYgPSBjLkdldEZpeHR1cmVMaXN0KCk7IGY7IGYgPSBmLm1fbmV4dCkge1xyXG4gICAgdmFyIHMgPSBmLkdldFNoYXBlKCk7XHJcblxyXG4gICAgdmFyIHAgPSB7XHJcbiAgICAgIHZ0eDogW10sXHJcbiAgICAgIG51bTogMFxyXG4gICAgfVxyXG5cclxuICAgIHAubnVtID0gcy5tX3ZlcnRleENvdW50O1xyXG5cclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcy5tX3ZlcnRleENvdW50OyBpKyspIHtcclxuICAgICAgcC52dHgucHVzaChjLkdldFdvcmxkUG9pbnQocy5tX3ZlcnRpY2VzW2ldKSk7XHJcbiAgICB9XHJcblxyXG4gICAgZ2MucHVzaChwKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBnYztcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfZ2V0X3doZWVsKHcpIHtcclxuICB2YXIgZ3cgPSBbXTtcclxuXHJcbiAgZm9yICh2YXIgZiA9IHcuR2V0Rml4dHVyZUxpc3QoKTsgZjsgZiA9IGYubV9uZXh0KSB7XHJcbiAgICB2YXIgcyA9IGYuR2V0U2hhcGUoKTtcclxuXHJcbiAgICB2YXIgYyA9IHtcclxuICAgICAgcG9zOiB3LkdldFdvcmxkUG9pbnQocy5tX3ApLFxyXG4gICAgICByYWQ6IHMubV9yYWRpdXMsXHJcbiAgICAgIGFuZzogdy5tX3N3ZWVwLmFcclxuICAgIH1cclxuXHJcbiAgICBndy5wdXNoKGMpO1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIGd3O1xyXG59XHJcbiIsIlxyXG52YXIgZ2hvc3RfZ2V0X2ZyYW1lID0gcmVxdWlyZShcIi4vY2FyLXRvLWdob3N0LmpzXCIpO1xyXG5cclxudmFyIGVuYWJsZV9naG9zdCA9IHRydWU7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBnaG9zdF9jcmVhdGVfcmVwbGF5OiBnaG9zdF9jcmVhdGVfcmVwbGF5LFxyXG4gIGdob3N0X2NyZWF0ZV9naG9zdDogZ2hvc3RfY3JlYXRlX2dob3N0LFxyXG4gIGdob3N0X3BhdXNlOiBnaG9zdF9wYXVzZSxcclxuICBnaG9zdF9yZXN1bWU6IGdob3N0X3Jlc3VtZSxcclxuICBnaG9zdF9nZXRfcG9zaXRpb246IGdob3N0X2dldF9wb3NpdGlvbixcclxuICBnaG9zdF9jb21wYXJlX3RvX3JlcGxheTogZ2hvc3RfY29tcGFyZV90b19yZXBsYXksXHJcbiAgZ2hvc3RfbW92ZV9mcmFtZTogZ2hvc3RfbW92ZV9mcmFtZSxcclxuICBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lOiBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lLFxyXG4gIGdob3N0X2RyYXdfZnJhbWU6IGdob3N0X2RyYXdfZnJhbWUsXHJcbiAgZ2hvc3RfcmVzZXRfZ2hvc3Q6IGdob3N0X3Jlc2V0X2dob3N0XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X2NyZWF0ZV9yZXBsYXkoKSB7XHJcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXHJcbiAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIG51bV9mcmFtZXM6IDAsXHJcbiAgICBmcmFtZXM6IFtdLFxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfY3JlYXRlX2dob3N0KCkge1xyXG4gIGlmICghZW5hYmxlX2dob3N0KVxyXG4gICAgcmV0dXJuIG51bGw7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICByZXBsYXk6IG51bGwsXHJcbiAgICBmcmFtZTogMCxcclxuICAgIGRpc3Q6IC0xMDBcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X3Jlc2V0X2dob3N0KGdob3N0KSB7XHJcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKGdob3N0ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcbiAgZ2hvc3QuZnJhbWUgPSAwO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9wYXVzZShnaG9zdCkge1xyXG4gIGlmIChnaG9zdCAhPSBudWxsKVxyXG4gICAgZ2hvc3Qub2xkX2ZyYW1lID0gZ2hvc3QuZnJhbWU7XHJcbiAgZ2hvc3RfcmVzZXRfZ2hvc3QoZ2hvc3QpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9yZXN1bWUoZ2hvc3QpIHtcclxuICBpZiAoZ2hvc3QgIT0gbnVsbClcclxuICAgIGdob3N0LmZyYW1lID0gZ2hvc3Qub2xkX2ZyYW1lO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9nZXRfcG9zaXRpb24oZ2hvc3QpIHtcclxuICBpZiAoIWVuYWJsZV9naG9zdClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QgPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QuZnJhbWUgPCAwKVxyXG4gICAgcmV0dXJuO1xyXG4gIGlmIChnaG9zdC5yZXBsYXkgPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuICB2YXIgZnJhbWUgPSBnaG9zdC5yZXBsYXkuZnJhbWVzW2dob3N0LmZyYW1lXTtcclxuICByZXR1cm4gZnJhbWUucG9zO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9jb21wYXJlX3RvX3JlcGxheShyZXBsYXksIGdob3N0LCBtYXgpIHtcclxuICBpZiAoIWVuYWJsZV9naG9zdClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QgPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuICBpZiAocmVwbGF5ID09IG51bGwpXHJcbiAgICByZXR1cm47XHJcblxyXG4gIGlmIChnaG9zdC5kaXN0IDwgbWF4KSB7XHJcbiAgICBnaG9zdC5yZXBsYXkgPSByZXBsYXk7XHJcbiAgICBnaG9zdC5kaXN0ID0gbWF4O1xyXG4gICAgZ2hvc3QuZnJhbWUgPSAwO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfbW92ZV9mcmFtZShnaG9zdCkge1xyXG4gIGlmICghZW5hYmxlX2dob3N0KVxyXG4gICAgcmV0dXJuO1xyXG4gIGlmIChnaG9zdCA9PSBudWxsKVxyXG4gICAgcmV0dXJuO1xyXG4gIGlmIChnaG9zdC5yZXBsYXkgPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuICBnaG9zdC5mcmFtZSsrO1xyXG4gIGlmIChnaG9zdC5mcmFtZSA+PSBnaG9zdC5yZXBsYXkubnVtX2ZyYW1lcylcclxuICAgIGdob3N0LmZyYW1lID0gZ2hvc3QucmVwbGF5Lm51bV9mcmFtZXMgLSAxO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lKHJlcGxheSwgY2FyKSB7XHJcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXHJcbiAgICByZXR1cm47XHJcbiAgaWYgKHJlcGxheSA9PSBudWxsKVxyXG4gICAgcmV0dXJuO1xyXG5cclxuICB2YXIgZnJhbWUgPSBnaG9zdF9nZXRfZnJhbWUoY2FyKTtcclxuICByZXBsYXkuZnJhbWVzLnB1c2goZnJhbWUpO1xyXG4gIHJlcGxheS5udW1fZnJhbWVzKys7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdob3N0X2RyYXdfZnJhbWUoY3R4LCBnaG9zdCwgY2FtZXJhKSB7XHJcbiAgdmFyIHpvb20gPSBjYW1lcmEuem9vbTtcclxuICBpZiAoIWVuYWJsZV9naG9zdClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QgPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuICBpZiAoZ2hvc3QuZnJhbWUgPCAwKVxyXG4gICAgcmV0dXJuO1xyXG4gIGlmIChnaG9zdC5yZXBsYXkgPT0gbnVsbClcclxuICAgIHJldHVybjtcclxuXHJcbiAgdmFyIGZyYW1lID0gZ2hvc3QucmVwbGF5LmZyYW1lc1tnaG9zdC5mcmFtZV07XHJcblxyXG4gIC8vIHdoZWVsIHN0eWxlXHJcbiAgY3R4LmZpbGxTdHlsZSA9IFwiI2VlZVwiO1xyXG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiI2FhYVwiO1xyXG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcclxuXHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBmcmFtZS53aGVlbHMubGVuZ3RoOyBpKyspIHtcclxuICAgIGZvciAodmFyIHcgaW4gZnJhbWUud2hlZWxzW2ldKSB7XHJcbiAgICAgIGdob3N0X2RyYXdfY2lyY2xlKGN0eCwgZnJhbWUud2hlZWxzW2ldW3ddLnBvcywgZnJhbWUud2hlZWxzW2ldW3ddLnJhZCwgZnJhbWUud2hlZWxzW2ldW3ddLmFuZyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBjaGFzc2lzIHN0eWxlXHJcbiAgY3R4LnN0cm9rZVN0eWxlID0gXCIjYWFhXCI7XHJcbiAgY3R4LmZpbGxTdHlsZSA9IFwiI2VlZVwiO1xyXG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcclxuICBjdHguYmVnaW5QYXRoKCk7XHJcbiAgZm9yICh2YXIgYyBpbiBmcmFtZS5jaGFzc2lzKVxyXG4gICAgZ2hvc3RfZHJhd19wb2x5KGN0eCwgZnJhbWUuY2hhc3Npc1tjXS52dHgsIGZyYW1lLmNoYXNzaXNbY10ubnVtKTtcclxuICBjdHguZmlsbCgpO1xyXG4gIGN0eC5zdHJva2UoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2hvc3RfZHJhd19wb2x5KGN0eCwgdnR4LCBuX3Z0eCkge1xyXG4gIGN0eC5tb3ZlVG8odnR4WzBdLngsIHZ0eFswXS55KTtcclxuICBmb3IgKHZhciBpID0gMTsgaSA8IG5fdnR4OyBpKyspIHtcclxuICAgIGN0eC5saW5lVG8odnR4W2ldLngsIHZ0eFtpXS55KTtcclxuICB9XHJcbiAgY3R4LmxpbmVUbyh2dHhbMF0ueCwgdnR4WzBdLnkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnaG9zdF9kcmF3X2NpcmNsZShjdHgsIGNlbnRlciwgcmFkaXVzLCBhbmdsZSkge1xyXG4gIGN0eC5iZWdpblBhdGgoKTtcclxuICBjdHguYXJjKGNlbnRlci54LCBjZW50ZXIueSwgcmFkaXVzLCAwLCAyICogTWF0aC5QSSwgdHJ1ZSk7XHJcblxyXG4gIGN0eC5tb3ZlVG8oY2VudGVyLngsIGNlbnRlci55KTtcclxuICBjdHgubGluZVRvKGNlbnRlci54ICsgcmFkaXVzICogTWF0aC5jb3MoYW5nbGUpLCBjZW50ZXIueSArIHJhZGl1cyAqIE1hdGguc2luKGFuZ2xlKSk7XHJcblxyXG4gIGN0eC5maWxsKCk7XHJcbiAgY3R4LnN0cm9rZSgpO1xyXG59XHJcbiIsIi8qIGdsb2JhbHMgZG9jdW1lbnQgcGVyZm9ybWFuY2UgbG9jYWxTdG9yYWdlIGFsZXJ0IGNvbmZpcm0gYnRvYSBIVE1MRGl2RWxlbWVudCAqL1xyXG4vKiBnbG9iYWxzIGIyVmVjMiAqL1xyXG4vLyBHbG9iYWwgVmFyc1xyXG5cclxudmFyIHdvcmxkUnVuID0gcmVxdWlyZShcIi4vd29ybGQvcnVuLmpzXCIpO1xyXG52YXIgY2FyQ29uc3RydWN0ID0gcmVxdWlyZShcIi4vY2FyLXNjaGVtYS9jb25zdHJ1Y3QuanNcIik7XHJcblxyXG52YXIgbWFuYWdlUm91bmQgPSByZXF1aXJlKFwiLi9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL21hbmFnZS1yb3VuZC5qc1wiKTtcclxuXHJcbnZhciBnaG9zdF9mbnMgPSByZXF1aXJlKFwiLi9naG9zdC9pbmRleC5qc1wiKTtcclxuXHJcbnZhciBkcmF3Q2FyID0gcmVxdWlyZShcIi4vZHJhdy9kcmF3LWNhci5qc1wiKTtcclxudmFyIGdyYXBoX2ZucyA9IHJlcXVpcmUoXCIuL2RyYXcvcGxvdC1ncmFwaHMuanNcIik7XHJcbnZhciBwbG90X2dyYXBocyA9IGdyYXBoX2Zucy5wbG90R3JhcGhzO1xyXG52YXIgY3dfY2xlYXJHcmFwaGljcyA9IGdyYXBoX2Zucy5jbGVhckdyYXBoaWNzO1xyXG52YXIgY3dfZHJhd0Zsb29yID0gcmVxdWlyZShcIi4vZHJhdy9kcmF3LWZsb29yLmpzXCIpO1xyXG5cclxudmFyIGdob3N0X2RyYXdfZnJhbWUgPSBnaG9zdF9mbnMuZ2hvc3RfZHJhd19mcmFtZTtcclxudmFyIGdob3N0X2NyZWF0ZV9naG9zdCA9IGdob3N0X2Zucy5naG9zdF9jcmVhdGVfZ2hvc3Q7XHJcbnZhciBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lID0gZ2hvc3RfZm5zLmdob3N0X2FkZF9yZXBsYXlfZnJhbWU7XHJcbnZhciBnaG9zdF9jb21wYXJlX3RvX3JlcGxheSA9IGdob3N0X2Zucy5naG9zdF9jb21wYXJlX3RvX3JlcGxheTtcclxudmFyIGdob3N0X2dldF9wb3NpdGlvbiA9IGdob3N0X2Zucy5naG9zdF9nZXRfcG9zaXRpb247XHJcbnZhciBnaG9zdF9tb3ZlX2ZyYW1lID0gZ2hvc3RfZm5zLmdob3N0X21vdmVfZnJhbWU7XHJcbnZhciBnaG9zdF9yZXNldF9naG9zdCA9IGdob3N0X2Zucy5naG9zdF9yZXNldF9naG9zdFxyXG52YXIgZ2hvc3RfcGF1c2UgPSBnaG9zdF9mbnMuZ2hvc3RfcGF1c2U7XHJcbnZhciBnaG9zdF9yZXN1bWUgPSBnaG9zdF9mbnMuZ2hvc3RfcmVzdW1lO1xyXG52YXIgZ2hvc3RfY3JlYXRlX3JlcGxheSA9IGdob3N0X2Zucy5naG9zdF9jcmVhdGVfcmVwbGF5O1xyXG5cclxudmFyIGN3X0NhciA9IHJlcXVpcmUoXCIuL2RyYXcvZHJhdy1jYXItc3RhdHMuanNcIik7XHJcbnZhciBnaG9zdDtcclxudmFyIGNhck1hcCA9IG5ldyBNYXAoKTtcclxuXHJcbnZhciBkb0RyYXcgPSB0cnVlO1xyXG52YXIgY3dfcGF1c2VkID0gZmFsc2U7XHJcblxyXG52YXIgYm94MmRmcHMgPSA2MDtcclxudmFyIHNjcmVlbmZwcyA9IDYwO1xyXG52YXIgc2tpcFRpY2tzID0gTWF0aC5yb3VuZCgxMDAwIC8gYm94MmRmcHMpO1xyXG52YXIgbWF4RnJhbWVTa2lwID0gc2tpcFRpY2tzICogMjtcclxuXHJcbnZhciBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1haW5ib3hcIik7XHJcbnZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xyXG5cclxudmFyIGNhbWVyYSA9IHtcclxuICBzcGVlZDogMC4wNSxcclxuICBwb3M6IHtcclxuICAgIHg6IDAsIHk6IDBcclxuICB9LFxyXG4gIHRhcmdldDogLTEsXHJcbiAgem9vbTogNzBcclxufVxyXG5cclxudmFyIG1pbmltYXBjYW1lcmEgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1pbmltYXBjYW1lcmFcIikuc3R5bGU7XHJcbnZhciBtaW5pbWFwaG9sZGVyID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNtaW5pbWFwaG9sZGVyXCIpO1xyXG5cclxudmFyIG1pbmltYXBjYW52YXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1pbmltYXBcIik7XHJcbnZhciBtaW5pbWFwY3R4ID0gbWluaW1hcGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcbnZhciBtaW5pbWFwc2NhbGUgPSAzO1xyXG52YXIgbWluaW1hcGZvZ2Rpc3RhbmNlID0gMDtcclxudmFyIGZvZ2Rpc3RhbmNlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJtaW5pbWFwZm9nXCIpLnN0eWxlO1xyXG5cclxuXHJcbnZhciBjYXJDb25zdGFudHMgPSBjYXJDb25zdHJ1Y3QuY2FyQ29uc3RhbnRzKCk7XHJcblxyXG5cclxudmFyIG1heF9jYXJfaGVhbHRoID0gYm94MmRmcHMgKiAxMDtcclxuXHJcbnZhciBjd19naG9zdFJlcGxheUludGVydmFsID0gbnVsbDtcclxuXHJcbnZhciBkaXN0YW5jZU1ldGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJkaXN0YW5jZW1ldGVyXCIpO1xyXG52YXIgaGVpZ2h0TWV0ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImhlaWdodG1ldGVyXCIpO1xyXG5cclxudmFyIGxlYWRlclBvc2l0aW9uID0ge1xyXG4gIHg6IDAsIHk6IDBcclxufVxyXG5cclxubWluaW1hcGNhbWVyYS53aWR0aCA9IDEyICogbWluaW1hcHNjYWxlICsgXCJweFwiO1xyXG5taW5pbWFwY2FtZXJhLmhlaWdodCA9IDYgKiBtaW5pbWFwc2NhbGUgKyBcInB4XCI7XHJcblxyXG5cclxuLy8gPT09PT09PSBXT1JMRCBTVEFURSA9PT09PT1cclxudmFyIGdlbmVyYXRpb25Db25maWcgPSByZXF1aXJlKFwiLi9nZW5lcmF0aW9uLWNvbmZpZ1wiKTtcclxuXHJcblxyXG52YXIgd29ybGRfZGVmID0ge1xyXG4gIGdyYXZpdHk6IG5ldyBiMlZlYzIoMC4wLCAtOS44MSksXHJcbiAgZG9TbGVlcDogdHJ1ZSxcclxuICBmbG9vcnNlZWQ6IGJ0b2EoTWF0aC5zZWVkcmFuZG9tKCkpLFxyXG4gIHRpbGVEaW1lbnNpb25zOiBuZXcgYjJWZWMyKDEuNSwgMC4xNSksXHJcbiAgbWF4Rmxvb3JUaWxlczogMjAwLFxyXG4gIG11dGFibGVfZmxvb3I6IGZhbHNlLFxyXG4gIGJveDJkZnBzOiBib3gyZGZwcyxcclxuICBtb3RvclNwZWVkOiAyMCxcclxuICBtYXhfY2FyX2hlYWx0aDogbWF4X2Nhcl9oZWFsdGgsXHJcbiAgc2NoZW1hOiBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5zY2hlbWFcclxufVxyXG5cclxudmFyIGN3X2RlYWRDYXJzO1xyXG5cclxudmFyIGFyck9mR3JhcGhTdGF0ZXMgPSBbXTtcclxuXHJcbnZhciBncmFwaFN0YXRlID0ge1xyXG4gIGN3X3RvcFNjb3JlczogW10sXHJcbiAgY3dfZ3JhcGhBdmVyYWdlOiBbXSxcclxuICBjd19ncmFwaEVsaXRlOiBbXSxcclxuICBjd19ncmFwaFRvcDogW10sXHJcbn07XHJcblxyXG5mdW5jdGlvbiByZXNldEdyYXBoU3RhdGUoKXtcclxuICBncmFwaFN0YXRlID0ge1xyXG4gICAgY3dfdG9wU2NvcmVzOiBbXSxcclxuICAgIGN3X2dyYXBoQXZlcmFnZTogW10sXHJcbiAgICBjd19ncmFwaEVsaXRlOiBbXSxcclxuICAgIGN3X2dyYXBoVG9wOiBbXSxcclxuICB9O1xyXG59XHJcblxyXG5cclxuXHJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09XHJcblxyXG52YXIgZ2VuZXJhdGlvblN0YXRlO1xyXG5cclxuLy8gPT09PT09PT0gQWN0aXZpdHkgU3RhdGUgPT09PVxyXG52YXIgY3VycmVudFJ1bm5lcjtcclxudmFyIGxvb3BzID0gMDtcclxudmFyIG5leHRHYW1lVGljayA9IChuZXcgRGF0ZSkuZ2V0VGltZSgpO1xyXG5cclxuZnVuY3Rpb24gc2hvd0Rpc3RhbmNlKGRpc3RhbmNlLCBoZWlnaHQpIHtcclxuICBkaXN0YW5jZU1ldGVyLmlubmVySFRNTCA9IGRpc3RhbmNlICsgXCIgbWV0ZXJzPGJyIC8+XCI7XHJcbiAgaGVpZ2h0TWV0ZXIuaW5uZXJIVE1MID0gaGVpZ2h0ICsgXCIgbWV0ZXJzXCI7XHJcbiAgaWYgKGRpc3RhbmNlID4gbWluaW1hcGZvZ2Rpc3RhbmNlKSB7XHJcbiAgICBmb2dkaXN0YW5jZS53aWR0aCA9IDgwMCAtIE1hdGgucm91bmQoZGlzdGFuY2UgKyAxNSkgKiBtaW5pbWFwc2NhbGUgKyBcInB4XCI7XHJcbiAgICBtaW5pbWFwZm9nZGlzdGFuY2UgPSBkaXN0YW5jZTtcclxuICB9XHJcbn1cclxuXHJcblxyXG5cclxuLyogPT09IEVORCBDYXIgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcblxyXG5cclxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG4vKiA9PT09IEdlbmVyYXRpb24gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcblxyXG5mdW5jdGlvbiBjd19nZW5lcmF0aW9uWmVybygpIHtcclxuXHJcbiAgZ2VuZXJhdGlvblN0YXRlID0gbWFuYWdlUm91bmQuZ2VuZXJhdGlvblplcm8oZ2VuZXJhdGlvbkNvbmZpZygpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gcmVzZXRDYXJVSSgpe1xyXG4gIGN3X2RlYWRDYXJzID0gMDtcclxuICBsZWFkZXJQb3NpdGlvbiA9IHtcclxuICAgIHg6IDAsIHk6IDBcclxuICB9O1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ2VuZXJhdGlvblwiKS5pbm5lckhUTUwgPSBnZW5lcmF0aW9uU3RhdGUuY291bnRlci50b1N0cmluZygpO1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2Fyc1wiKS5pbm5lckhUTUwgPSBcIlwiO1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwicG9wdWxhdGlvblwiKS5pbm5lckhUTUwgPSBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5nZW5lcmF0aW9uU2l6ZS50b1N0cmluZygpO1xyXG59XHJcblxyXG4vKiA9PT09IEVORCBHZW5yYXRpb24gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuXHJcbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuLyogPT09PSBEcmF3aW5nID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuZnVuY3Rpb24gY3dfZHJhd1NjcmVlbigpIHtcclxuICB2YXIgZmxvb3JUaWxlcyA9IGN1cnJlbnRSdW5uZXIuc2NlbmUuZmxvb3JUaWxlcztcclxuICBjdHguY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XHJcbiAgY3R4LnNhdmUoKTtcclxuICBjd19zZXRDYW1lcmFQb3NpdGlvbigpO1xyXG4gIHZhciBjYW1lcmFfeCA9IGNhbWVyYS5wb3MueDtcclxuICB2YXIgY2FtZXJhX3kgPSBjYW1lcmEucG9zLnk7XHJcbiAgdmFyIHpvb20gPSBjYW1lcmEuem9vbTtcclxuICBjdHgudHJhbnNsYXRlKDIwMCAtIChjYW1lcmFfeCAqIHpvb20pLCAyMDAgKyAoY2FtZXJhX3kgKiB6b29tKSk7XHJcbiAgY3R4LnNjYWxlKHpvb20sIC16b29tKTtcclxuICBjd19kcmF3Rmxvb3IoY3R4LCBjYW1lcmEsIGZsb29yVGlsZXMpO1xyXG4gIGdob3N0X2RyYXdfZnJhbWUoY3R4LCBnaG9zdCwgY2FtZXJhKTtcclxuICBjd19kcmF3Q2FycygpO1xyXG4gIGN0eC5yZXN0b3JlKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X21pbmltYXBDYW1lcmEoLyogeCwgeSovKSB7XHJcbiAgdmFyIGNhbWVyYV94ID0gY2FtZXJhLnBvcy54XHJcbiAgdmFyIGNhbWVyYV95ID0gY2FtZXJhLnBvcy55XHJcbiAgbWluaW1hcGNhbWVyYS5sZWZ0ID0gTWF0aC5yb3VuZCgoMiArIGNhbWVyYV94KSAqIG1pbmltYXBzY2FsZSkgKyBcInB4XCI7XHJcbiAgbWluaW1hcGNhbWVyYS50b3AgPSBNYXRoLnJvdW5kKCgzMSAtIGNhbWVyYV95KSAqIG1pbmltYXBzY2FsZSkgKyBcInB4XCI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3NldENhbWVyYVRhcmdldChrKSB7XHJcbiAgY2FtZXJhLnRhcmdldCA9IGs7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3NldENhbWVyYVBvc2l0aW9uKCkge1xyXG4gIHZhciBjYW1lcmFUYXJnZXRQb3NpdGlvblxyXG4gIGlmIChjYW1lcmEudGFyZ2V0ICE9PSAtMSkge1xyXG4gICAgY2FtZXJhVGFyZ2V0UG9zaXRpb24gPSBjYXJNYXAuZ2V0KGNhbWVyYS50YXJnZXQpLmdldFBvc2l0aW9uKCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGNhbWVyYVRhcmdldFBvc2l0aW9uID0gbGVhZGVyUG9zaXRpb247XHJcbiAgfVxyXG4gIHZhciBkaWZmX3kgPSBjYW1lcmEucG9zLnkgLSBjYW1lcmFUYXJnZXRQb3NpdGlvbi55O1xyXG4gIHZhciBkaWZmX3ggPSBjYW1lcmEucG9zLnggLSBjYW1lcmFUYXJnZXRQb3NpdGlvbi54O1xyXG4gIGNhbWVyYS5wb3MueSAtPSBjYW1lcmEuc3BlZWQgKiBkaWZmX3k7XHJcbiAgY2FtZXJhLnBvcy54IC09IGNhbWVyYS5zcGVlZCAqIGRpZmZfeDtcclxuICBjd19taW5pbWFwQ2FtZXJhKGNhbWVyYS5wb3MueCwgY2FtZXJhLnBvcy55KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfZHJhd0dob3N0UmVwbGF5KCkge1xyXG4gIHZhciBmbG9vclRpbGVzID0gY3VycmVudFJ1bm5lci5zY2VuZS5mbG9vclRpbGVzO1xyXG4gIHZhciBjYXJQb3NpdGlvbiA9IGdob3N0X2dldF9wb3NpdGlvbihnaG9zdCk7XHJcbiAgY2FtZXJhLnBvcy54ID0gY2FyUG9zaXRpb24ueDtcclxuICBjYW1lcmEucG9zLnkgPSBjYXJQb3NpdGlvbi55O1xyXG4gIGN3X21pbmltYXBDYW1lcmEoY2FtZXJhLnBvcy54LCBjYW1lcmEucG9zLnkpO1xyXG4gIHNob3dEaXN0YW5jZShcclxuICAgIE1hdGgucm91bmQoY2FyUG9zaXRpb24ueCAqIDEwMCkgLyAxMDAsXHJcbiAgICBNYXRoLnJvdW5kKGNhclBvc2l0aW9uLnkgKiAxMDApIC8gMTAwXHJcbiAgKTtcclxuICBjdHguY2xlYXJSZWN0KDAsIDAsIGNhbnZhcy53aWR0aCwgY2FudmFzLmhlaWdodCk7XHJcbiAgY3R4LnNhdmUoKTtcclxuICBjdHgudHJhbnNsYXRlKFxyXG4gICAgMjAwIC0gKGNhclBvc2l0aW9uLnggKiBjYW1lcmEuem9vbSksXHJcbiAgICAyMDAgKyAoY2FyUG9zaXRpb24ueSAqIGNhbWVyYS56b29tKVxyXG4gICk7XHJcbiAgY3R4LnNjYWxlKGNhbWVyYS56b29tLCAtY2FtZXJhLnpvb20pO1xyXG4gIGdob3N0X2RyYXdfZnJhbWUoY3R4LCBnaG9zdCk7XHJcbiAgZ2hvc3RfbW92ZV9mcmFtZShnaG9zdCk7XHJcbiAgY3dfZHJhd0Zsb29yKGN0eCwgY2FtZXJhLCBmbG9vclRpbGVzKTtcclxuICBjdHgucmVzdG9yZSgpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gY3dfZHJhd0NhcnMoKSB7XHJcbiAgdmFyIGN3X2NhckFycmF5ID0gQXJyYXkuZnJvbShjYXJNYXAudmFsdWVzKCkpO1xyXG4gIGZvciAodmFyIGsgPSAoY3dfY2FyQXJyYXkubGVuZ3RoIC0gMSk7IGsgPj0gMDsgay0tKSB7XHJcbiAgICB2YXIgbXlDYXIgPSBjd19jYXJBcnJheVtrXTtcclxuICAgIGRyYXdDYXIoY2FyQ29uc3RhbnRzLCBteUNhciwgY2FtZXJhLCBjdHgpXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiB0b2dnbGVEaXNwbGF5KCkge1xyXG4gIGNhbnZhcy53aWR0aCA9IGNhbnZhcy53aWR0aDtcclxuICBpZiAoZG9EcmF3KSB7XHJcbiAgICBkb0RyYXcgPSBmYWxzZTtcclxuICAgIGN3X3N0b3BTaW11bGF0aW9uKCk7XHJcbiAgICBjd19ydW5uaW5nSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChmdW5jdGlvbiAoKSB7XHJcbiAgICAgIHZhciB0aW1lID0gcGVyZm9ybWFuY2Uubm93KCkgKyAoMTAwMCAvIHNjcmVlbmZwcyk7XHJcbiAgICAgIHdoaWxlICh0aW1lID4gcGVyZm9ybWFuY2Uubm93KCkpIHtcclxuICAgICAgICBzaW11bGF0aW9uU3RlcCgpO1xyXG4gICAgICB9XHJcbiAgICB9LCAxKTtcclxuICB9IGVsc2Uge1xyXG4gICAgZG9EcmF3ID0gdHJ1ZTtcclxuICAgIGNsZWFySW50ZXJ2YWwoY3dfcnVubmluZ0ludGVydmFsKTtcclxuICAgIGN3X3N0YXJ0U2ltdWxhdGlvbigpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3dfZHJhd01pbmlNYXAoKSB7XHJcbiAgdmFyIGZsb29yVGlsZXMgPSBjdXJyZW50UnVubmVyLnNjZW5lLmZsb29yVGlsZXM7XHJcbiAgdmFyIGxhc3RfdGlsZSA9IG51bGw7XHJcbiAgdmFyIHRpbGVfcG9zaXRpb24gPSBuZXcgYjJWZWMyKC01LCAwKTtcclxuICBtaW5pbWFwZm9nZGlzdGFuY2UgPSAwO1xyXG4gIGZvZ2Rpc3RhbmNlLndpZHRoID0gXCI4MDBweFwiO1xyXG4gIG1pbmltYXBjYW52YXMud2lkdGggPSBtaW5pbWFwY2FudmFzLndpZHRoO1xyXG4gIG1pbmltYXBjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcclxuICBtaW5pbWFwY3R4LmJlZ2luUGF0aCgpO1xyXG4gIG1pbmltYXBjdHgubW92ZVRvKDAsIDM1ICogbWluaW1hcHNjYWxlKTtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IGZsb29yVGlsZXMubGVuZ3RoOyBrKyspIHtcclxuICAgIGxhc3RfdGlsZSA9IGZsb29yVGlsZXNba107XHJcbiAgICB2YXIgbGFzdF9maXh0dXJlID0gbGFzdF90aWxlLkdldEZpeHR1cmVMaXN0KCk7XHJcbiAgICB2YXIgbGFzdF93b3JsZF9jb29yZHMgPSBsYXN0X3RpbGUuR2V0V29ybGRQb2ludChsYXN0X2ZpeHR1cmUuR2V0U2hhcGUoKS5tX3ZlcnRpY2VzWzNdKTtcclxuICAgIHRpbGVfcG9zaXRpb24gPSBsYXN0X3dvcmxkX2Nvb3JkcztcclxuICAgIG1pbmltYXBjdHgubGluZVRvKCh0aWxlX3Bvc2l0aW9uLnggKyA1KSAqIG1pbmltYXBzY2FsZSwgKC10aWxlX3Bvc2l0aW9uLnkgKyAzNSkgKiBtaW5pbWFwc2NhbGUpO1xyXG4gIH1cclxuICBtaW5pbWFwY3R4LnN0cm9rZSgpO1xyXG59XHJcblxyXG4vKiA9PT09IEVORCBEcmF3aW5nID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxudmFyIHVpTGlzdGVuZXJzID0ge1xyXG4gIHByZUNhclN0ZXA6IGZ1bmN0aW9uKCl7XHJcbiAgICBnaG9zdF9tb3ZlX2ZyYW1lKGdob3N0KTtcclxuICB9LFxyXG4gIGNhclN0ZXAoY2FyKXtcclxuICAgIHVwZGF0ZUNhclVJKGNhcik7XHJcbiAgfSxcclxuICBjYXJEZWF0aChjYXJJbmZvKXtcclxuXHJcbiAgICB2YXIgayA9IGNhckluZm8uaW5kZXg7XHJcblxyXG4gICAgdmFyIGNhciA9IGNhckluZm8uY2FyLCBzY29yZSA9IGNhckluZm8uc2NvcmU7XHJcbiAgICBjYXJNYXAuZ2V0KGNhckluZm8pLmtpbGwoY3VycmVudFJ1bm5lciwgd29ybGRfZGVmKTtcclxuXHJcbiAgICAvLyByZWZvY3VzIGNhbWVyYSB0byBsZWFkZXIgb24gZGVhdGhcclxuICAgIGlmIChjYW1lcmEudGFyZ2V0ID09IGNhckluZm8pIHtcclxuICAgICAgY3dfc2V0Q2FtZXJhVGFyZ2V0KC0xKTtcclxuICAgIH1cclxuICAgIC8vIGNvbnNvbGUubG9nKHNjb3JlKTtcclxuICAgIGNhck1hcC5kZWxldGUoY2FySW5mbyk7XHJcbiAgICBnaG9zdF9jb21wYXJlX3RvX3JlcGxheShjYXIucmVwbGF5LCBnaG9zdCwgc2NvcmUudik7XHJcbiAgICBzY29yZS5pID0gZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXI7XHJcblxyXG4gICAgY3dfZGVhZENhcnMrKztcclxuICAgIHZhciBnZW5lcmF0aW9uU2l6ZSA9IGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmdlbmVyYXRpb25TaXplO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwb3B1bGF0aW9uXCIpLmlubmVySFRNTCA9IChnZW5lcmF0aW9uU2l6ZSAtIGN3X2RlYWRDYXJzKS50b1N0cmluZygpO1xyXG5cclxuICAgIC8vIGNvbnNvbGUubG9nKGxlYWRlclBvc2l0aW9uLmxlYWRlciwgaylcclxuICAgIGlmIChsZWFkZXJQb3NpdGlvbi5sZWFkZXIgPT0gaykge1xyXG4gICAgICAvLyBsZWFkZXIgaXMgZGVhZCwgZmluZCBuZXcgbGVhZGVyXHJcbiAgICAgIGN3X2ZpbmRMZWFkZXIoKTtcclxuICAgIH1cclxuICB9LFxyXG4gIGdlbmVyYXRpb25FbmQocmVzdWx0cyl7XHJcbiAgICBjbGVhbnVwUm91bmQocmVzdWx0cyk7XHJcbiAgICByZXR1cm4gY3dfbmV3Um91bmQocmVzdWx0cyk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBzaW11bGF0aW9uU3RlcCgpIHsgIFxyXG4gIGN1cnJlbnRSdW5uZXIuc3RlcCgpO1xyXG4gIHNob3dEaXN0YW5jZShcclxuICAgIE1hdGgucm91bmQobGVhZGVyUG9zaXRpb24ueCAqIDEwMCkgLyAxMDAsXHJcbiAgICBNYXRoLnJvdW5kKGxlYWRlclBvc2l0aW9uLnkgKiAxMDApIC8gMTAwXHJcbiAgKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZ2FtZUxvb3AoKSB7XHJcbiAgLypsb29wcyA9IDA7XHJcbiAgd2hpbGUgKCFjd19wYXVzZWQgJiYgKG5ldyBEYXRlKS5nZXRUaW1lKCkgPiBuZXh0R2FtZVRpY2sgJiYgbG9vcHMgPCBtYXhGcmFtZVNraXApIHsgICBcclxuICAgIG5leHRHYW1lVGljayArPSBza2lwVGlja3M7XHJcbiAgICBsb29wcysrO1xyXG4gIH1cclxuICBzaW11bGF0aW9uU3RlcCgpO1xyXG4gIGN3X2RyYXdTY3JlZW4oKTtcclxuXHQqL1xyXG5cdGZhc3RGb3J3YXJkKCk7Ly91c2VkIGZvciB0ZXN0aW5nIGRhdGFcclxuICBpZighY3dfcGF1c2VkKSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGdhbWVMb29wKTtcclxufVxyXG5cclxuZnVuY3Rpb24gdXBkYXRlQ2FyVUkoY2FySW5mbyl7XHJcbiAgdmFyIGsgPSBjYXJJbmZvLmluZGV4O1xyXG4gIHZhciBjYXIgPSBjYXJNYXAuZ2V0KGNhckluZm8pO1xyXG4gIHZhciBwb3NpdGlvbiA9IGNhci5nZXRQb3NpdGlvbigpO1xyXG5cclxuICBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lKGNhci5yZXBsYXksIGNhci5jYXIuY2FyKTtcclxuICBjYXIubWluaW1hcG1hcmtlci5zdHlsZS5sZWZ0ID0gTWF0aC5yb3VuZCgocG9zaXRpb24ueCArIDUpICogbWluaW1hcHNjYWxlKSArIFwicHhcIjtcclxuICBjYXIuaGVhbHRoQmFyLndpZHRoID0gTWF0aC5yb3VuZCgoY2FyLmNhci5zdGF0ZS5oZWFsdGggLyBtYXhfY2FyX2hlYWx0aCkgKiAxMDApICsgXCIlXCI7XHJcbiAgaWYgKHBvc2l0aW9uLnggPiBsZWFkZXJQb3NpdGlvbi54KSB7XHJcbiAgICBsZWFkZXJQb3NpdGlvbiA9IHBvc2l0aW9uO1xyXG4gICAgbGVhZGVyUG9zaXRpb24ubGVhZGVyID0gaztcclxuICAgIC8vIGNvbnNvbGUubG9nKFwibmV3IGxlYWRlcjogXCIsIGspO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3dfZmluZExlYWRlcigpIHtcclxuICB2YXIgbGVhZCA9IDA7XHJcbiAgdmFyIGN3X2NhckFycmF5ID0gQXJyYXkuZnJvbShjYXJNYXAudmFsdWVzKCkpO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgY3dfY2FyQXJyYXkubGVuZ3RoOyBrKyspIHtcclxuICAgIGlmICghY3dfY2FyQXJyYXlba10uYWxpdmUpIHtcclxuICAgICAgY29udGludWU7XHJcbiAgICB9XHJcbiAgICB2YXIgcG9zaXRpb24gPSBjd19jYXJBcnJheVtrXS5nZXRQb3NpdGlvbigpO1xyXG4gICAgaWYgKHBvc2l0aW9uLnggPiBsZWFkKSB7XHJcbiAgICAgIGxlYWRlclBvc2l0aW9uID0gcG9zaXRpb247XHJcbiAgICAgIGxlYWRlclBvc2l0aW9uLmxlYWRlciA9IGs7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBmYXN0Rm9yd2FyZCgpe1xyXG4gIHZhciBnZW4gPSBnZW5lcmF0aW9uU3RhdGUuY291bnRlcjtcclxuICB3aGlsZShnZW4gPT09IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyKXtcclxuICAgIGN1cnJlbnRSdW5uZXIuc3RlcCgpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY2xlYW51cFJvdW5kKHJlc3VsdHMpe1xyXG5cclxuICByZXN1bHRzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcclxuICAgIGlmIChhLnNjb3JlLnYgPiBiLnNjb3JlLnYpIHtcclxuICAgICAgcmV0dXJuIC0xXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gMVxyXG4gICAgfVxyXG4gIH0pXHJcbiAgZ3JhcGhTdGF0ZSA9IHBsb3RfZ3JhcGhzKFxyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJncmFwaGNhbnZhc1wiKSxcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidG9wc2NvcmVzXCIpLFxyXG4gICAgbnVsbCxcclxuICAgIGdyYXBoU3RhdGUsXHJcbiAgICByZXN1bHRzXHJcbiAgKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfbmV3Um91bmQocmVzdWx0cykge1xyXG4gIGNhbWVyYS5wb3MueCA9IGNhbWVyYS5wb3MueSA9IDA7XHJcbiAgY3dfc2V0Q2FtZXJhVGFyZ2V0KC0xKTtcclxuICBnZW5lcmF0aW9uU3RhdGUgPW1hbmFnZVJvdW5kLm5leHRHZW5lcmF0aW9uKFxyXG4gICAgZ2VuZXJhdGlvblN0YXRlLCByZXN1bHRzLCBnZW5lcmF0aW9uQ29uZmlnKCkpO1xyXG5cdFxyXG5cdGlmKGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyPT09MCl7XHJcblx0XHR2YXIgcm91bmRzID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJyb3VuZFwiKTtcclxuXHRcdHZhciBuZXdSb3VuZHMgPSBnZW5lcmF0aW9uU3RhdGUucm91bmQrcm91bmRzO1xyXG5cdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJFQVwiK25ld1JvdW5kcywgSlNPTi5zdHJpbmdpZnkoZ3JhcGhTdGF0ZS5jd19ncmFwaEF2ZXJhZ2UpKTtcclxuXHRcdGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicm91bmRcIiwgbmV3Um91bmRzKTtcclxuXHRcdC8vZ3JhcGhTdGF0ZS5jd19ncmFwaEF2ZXJhZ2UgPSBuZXcgQXJyYXkoKTtcclxuXHRcdC8vcmVzZXRHcmFwaFN0YXRlKCk7XHJcblx0XHRsb2NhdGlvbi5yZWxvYWQoKTtcclxuXHR9XHJcblx0XHJcblx0XHJcbiAgaWYgKHdvcmxkX2RlZi5tdXRhYmxlX2Zsb29yKSB7XHJcbiAgICAvLyBHSE9TVCBESVNBQkxFRFxyXG4gICAgZ2hvc3QgPSBudWxsO1xyXG4gICAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGJ0b2EoTWF0aC5zZWVkcmFuZG9tKCkpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAvLyBSRS1FTkFCTEUgR0hPU1RcclxuICAgIGdob3N0X3Jlc2V0X2dob3N0KGdob3N0KTtcclxuICB9XHJcbiAgY3VycmVudFJ1bm5lciA9IHdvcmxkUnVuKHdvcmxkX2RlZiwgZ2VuZXJhdGlvblN0YXRlLmdlbmVyYXRpb24sIHVpTGlzdGVuZXJzKTtcclxuICBzZXR1cENhclVJKCk7XHJcbiAgY3dfZHJhd01pbmlNYXAoKTtcclxuICByZXNldENhclVJKCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3N0YXJ0U2ltdWxhdGlvbigpIHtcclxuICBjd19wYXVzZWQgPSBmYWxzZTtcclxuICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGdhbWVMb29wKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc3RvcFNpbXVsYXRpb24oKSB7XHJcbiAgY3dfcGF1c2VkID0gdHJ1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfY2xlYXJQb3B1bGF0aW9uV29ybGQoKSB7XHJcbiAgY2FyTWFwLmZvckVhY2goZnVuY3Rpb24oY2FyKXtcclxuICAgIGNhci5raWxsKGN1cnJlbnRSdW5uZXIsIHdvcmxkX2RlZik7XHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3Jlc2V0UG9wdWxhdGlvblVJKCkge1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ2VuZXJhdGlvblwiKS5pbm5lckhUTUwgPSBcIlwiO1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY2Fyc1wiKS5pbm5lckhUTUwgPSBcIlwiO1xyXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwidG9wc2NvcmVzXCIpLmlubmVySFRNTCA9IFwiXCI7XHJcbiAgY3dfY2xlYXJHcmFwaGljcyhkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdyYXBoY2FudmFzXCIpKTtcclxuICByZXNldEdyYXBoU3RhdGUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfcmVzZXRXb3JsZCgpIHtcclxuICBkb0RyYXcgPSB0cnVlO1xyXG4gIGN3X3N0b3BTaW11bGF0aW9uKCk7XHJcbiAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibmV3c2VlZFwiKS52YWx1ZTtcclxuICBjd19jbGVhclBvcHVsYXRpb25Xb3JsZCgpO1xyXG4gIGN3X3Jlc2V0UG9wdWxhdGlvblVJKCk7XHJcblxyXG4gIE1hdGguc2VlZHJhbmRvbSgpO1xyXG4gIGN3X2dlbmVyYXRpb25aZXJvKCk7XHJcbiAgY3VycmVudFJ1bm5lciA9IHdvcmxkUnVuKFxyXG4gICAgd29ybGRfZGVmLCBnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbiwgdWlMaXN0ZW5lcnNcclxuICApO1xyXG5cclxuICBnaG9zdCA9IGdob3N0X2NyZWF0ZV9naG9zdCgpO1xyXG4gIHJlc2V0Q2FyVUkoKTtcclxuICBzZXR1cENhclVJKClcclxuICBjd19kcmF3TWluaU1hcCgpO1xyXG5cclxuICBjd19zdGFydFNpbXVsYXRpb24oKTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2V0dXBDYXJVSSgpe1xyXG4gIGN1cnJlbnRSdW5uZXIuY2Fycy5tYXAoZnVuY3Rpb24oY2FySW5mbyl7XHJcbiAgICB2YXIgY2FyID0gbmV3IGN3X0NhcihjYXJJbmZvLCBjYXJNYXApO1xyXG4gICAgY2FyTWFwLnNldChjYXJJbmZvLCBjYXIpO1xyXG4gICAgY2FyLnJlcGxheSA9IGdob3N0X2NyZWF0ZV9yZXBsYXkoKTtcclxuICAgIGdob3N0X2FkZF9yZXBsYXlfZnJhbWUoY2FyLnJlcGxheSwgY2FyLmNhci5jYXIpO1xyXG4gIH0pXHJcbn1cclxuXHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2Zhc3QtZm9yd2FyZFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcclxuICBmYXN0Rm9yd2FyZCgpXHJcbn0pO1xyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNzYXZlLXByb2dyZXNzXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xyXG4gIHNhdmVQcm9ncmVzcygpXHJcbn0pO1xyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNyZXN0b3JlLXByb2dyZXNzXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xyXG4gIHJlc3RvcmVQcm9ncmVzcygpXHJcbn0pO1xyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiN0b2dnbGUtZGlzcGxheVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcclxuICB0b2dnbGVEaXNwbGF5KClcclxufSlcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbmV3LXBvcHVsYXRpb25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XHJcbiAgY3dfcmVzZXRQb3B1bGF0aW9uVUkoKVxyXG4gIGN3X2dlbmVyYXRpb25aZXJvKCk7XHJcbiAgZ2hvc3QgPSBnaG9zdF9jcmVhdGVfZ2hvc3QoKTtcclxuICByZXNldENhclVJKCk7XHJcbn0pXHJcblxyXG5mdW5jdGlvbiBzYXZlUHJvZ3Jlc3MoKSB7XHJcbiAgbG9jYWxTdG9yYWdlLmN3X3NhdmVkR2VuZXJhdGlvbiA9IEpTT04uc3RyaW5naWZ5KGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uKTtcclxuICBsb2NhbFN0b3JhZ2UuY3dfZ2VuQ291bnRlciA9IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyO1xyXG4gIGxvY2FsU3RvcmFnZS5jd19naG9zdCA9IEpTT04uc3RyaW5naWZ5KGdob3N0KTtcclxuICBsb2NhbFN0b3JhZ2UuY3dfdG9wU2NvcmVzID0gSlNPTi5zdHJpbmdpZnkoZ3JhcGhTdGF0ZS5jd190b3BTY29yZXMpO1xyXG4gIGxvY2FsU3RvcmFnZS5jd19mbG9vclNlZWQgPSB3b3JsZF9kZWYuZmxvb3JzZWVkO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZXN0b3JlUHJvZ3Jlc3MoKSB7XHJcbiAgaWYgKHR5cGVvZiBsb2NhbFN0b3JhZ2UuY3dfc2F2ZWRHZW5lcmF0aW9uID09ICd1bmRlZmluZWQnIHx8IGxvY2FsU3RvcmFnZS5jd19zYXZlZEdlbmVyYXRpb24gPT0gbnVsbCkge1xyXG4gICAgYWxlcnQoXCJObyBzYXZlZCBwcm9ncmVzcyBmb3VuZFwiKTtcclxuICAgIHJldHVybjtcclxuICB9XHJcbiAgY3dfc3RvcFNpbXVsYXRpb24oKTtcclxuICBnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbiA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmN3X3NhdmVkR2VuZXJhdGlvbik7XHJcbiAgZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXIgPSBsb2NhbFN0b3JhZ2UuY3dfZ2VuQ291bnRlcjtcclxuICBnaG9zdCA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmN3X2dob3N0KTtcclxuICBncmFwaFN0YXRlLmN3X3RvcFNjb3JlcyA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmN3X3RvcFNjb3Jlcyk7XHJcbiAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGxvY2FsU3RvcmFnZS5jd19mbG9vclNlZWQ7XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuZXdzZWVkXCIpLnZhbHVlID0gd29ybGRfZGVmLmZsb29yc2VlZDtcclxuXHJcbiAgY3VycmVudFJ1bm5lciA9IHdvcmxkUnVuKHdvcmxkX2RlZiwgZ2VuZXJhdGlvblN0YXRlLmdlbmVyYXRpb24sIHVpTGlzdGVuZXJzKTtcclxuICBjd19kcmF3TWluaU1hcCgpO1xyXG4gIE1hdGguc2VlZHJhbmRvbSgpO1xyXG5cclxuICByZXNldENhclVJKCk7XHJcbiAgY3dfc3RhcnRTaW11bGF0aW9uKCk7XHJcbn1cclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjY29uZmlybS1yZXNldFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcclxuICBjd19jb25maXJtUmVzZXRXb3JsZCgpXHJcbn0pXHJcblxyXG5mdW5jdGlvbiBjd19jb25maXJtUmVzZXRXb3JsZCgpIHtcclxuICBpZiAoY29uZmlybSgnUmVhbGx5IHJlc2V0IHdvcmxkPycpKSB7XHJcbiAgICBjd19yZXNldFdvcmxkKCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcbn1cclxuXHJcbi8vIGdob3N0IHJlcGxheSBzdHVmZlxyXG5cclxuXHJcbmZ1bmN0aW9uIGN3X3BhdXNlU2ltdWxhdGlvbigpIHtcclxuICBjd19wYXVzZWQgPSB0cnVlO1xyXG4gIGdob3N0X3BhdXNlKGdob3N0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfcmVzdW1lU2ltdWxhdGlvbigpIHtcclxuICBjd19wYXVzZWQgPSBmYWxzZTtcclxuICBnaG9zdF9yZXN1bWUoZ2hvc3QpO1xyXG4gIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZ2FtZUxvb3ApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zdGFydEdob3N0UmVwbGF5KCkge1xyXG4gIGlmICghZG9EcmF3KSB7XHJcbiAgICB0b2dnbGVEaXNwbGF5KCk7XHJcbiAgfVxyXG4gIGN3X3BhdXNlU2ltdWxhdGlvbigpO1xyXG4gIGN3X2dob3N0UmVwbGF5SW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChjd19kcmF3R2hvc3RSZXBsYXksIE1hdGgucm91bmQoMTAwMCAvIHNjcmVlbmZwcykpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zdG9wR2hvc3RSZXBsYXkoKSB7XHJcbiAgY2xlYXJJbnRlcnZhbChjd19naG9zdFJlcGxheUludGVydmFsKTtcclxuICBjd19naG9zdFJlcGxheUludGVydmFsID0gbnVsbDtcclxuICBjd19maW5kTGVhZGVyKCk7XHJcbiAgY2FtZXJhLnBvcy54ID0gbGVhZGVyUG9zaXRpb24ueDtcclxuICBjYW1lcmEucG9zLnkgPSBsZWFkZXJQb3NpdGlvbi55O1xyXG4gIGN3X3Jlc3VtZVNpbXVsYXRpb24oKTtcclxufVxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiN0b2dnbGUtZ2hvc3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKGUpe1xyXG4gIGN3X3RvZ2dsZUdob3N0UmVwbGF5KGUudGFyZ2V0KVxyXG59KVxyXG5cclxuZnVuY3Rpb24gY3dfdG9nZ2xlR2hvc3RSZXBsYXkoYnV0dG9uKSB7XHJcbiAgaWYgKGN3X2dob3N0UmVwbGF5SW50ZXJ2YWwgPT0gbnVsbCkge1xyXG4gICAgY3dfc3RhcnRHaG9zdFJlcGxheSgpO1xyXG4gICAgYnV0dG9uLnZhbHVlID0gXCJSZXN1bWUgc2ltdWxhdGlvblwiO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBjd19zdG9wR2hvc3RSZXBsYXkoKTtcclxuICAgIGJ1dHRvbi52YWx1ZSA9IFwiVmlldyB0b3AgcmVwbGF5XCI7XHJcbiAgfVxyXG59XHJcbi8vIGdob3N0IHJlcGxheSBzdHVmZiBFTkRcclxuXHJcbi8vIGluaXRpYWwgc3R1ZmYsIG9ubHkgY2FsbGVkIG9uY2UgKGhvcGVmdWxseSlcclxuZnVuY3Rpb24gY3dfaW5pdCgpIHtcclxuICAvLyBjbG9uZSBzaWx2ZXIgZG90IGFuZCBoZWFsdGggYmFyXHJcbiAgdmFyIG1tbSA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKCdtaW5pbWFwbWFya2VyJylbMF07XHJcbiAgdmFyIGhiYXIgPSBkb2N1bWVudC5nZXRFbGVtZW50c0J5TmFtZSgnaGVhbHRoYmFyJylbMF07XHJcbiAgdmFyIGdlbmVyYXRpb25TaXplID0gZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuZ2VuZXJhdGlvblNpemU7XHJcblxyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xyXG5cclxuICAgIC8vIG1pbmltYXAgbWFya2Vyc1xyXG4gICAgdmFyIG5ld2JhciA9IG1tbS5jbG9uZU5vZGUodHJ1ZSk7XHJcbiAgICBuZXdiYXIuaWQgPSBcImJhclwiICsgaztcclxuICAgIG5ld2Jhci5zdHlsZS5wYWRkaW5nVG9wID0gayAqIDkgKyBcInB4XCI7XHJcbiAgICBtaW5pbWFwaG9sZGVyLmFwcGVuZENoaWxkKG5ld2Jhcik7XHJcblxyXG4gICAgLy8gaGVhbHRoIGJhcnNcclxuICAgIHZhciBuZXdoZWFsdGggPSBoYmFyLmNsb25lTm9kZSh0cnVlKTtcclxuICAgIG5ld2hlYWx0aC5nZXRFbGVtZW50c0J5VGFnTmFtZShcIkRJVlwiKVswXS5pZCA9IFwiaGVhbHRoXCIgKyBrO1xyXG4gICAgbmV3aGVhbHRoLmNhcl9pbmRleCA9IGs7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImhlYWx0aFwiKS5hcHBlbmRDaGlsZChuZXdoZWFsdGgpO1xyXG4gIH1cclxuICBtbW0ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChtbW0pO1xyXG4gIGhiYXIucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChoYmFyKTtcclxuICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gYnRvYShNYXRoLnNlZWRyYW5kb20oKSk7XHJcbiAgY3dfZ2VuZXJhdGlvblplcm8oKTtcclxuICBnaG9zdCA9IGdob3N0X2NyZWF0ZV9naG9zdCgpO1xyXG4gIHJlc2V0Q2FyVUkoKTtcclxuICBjdXJyZW50UnVubmVyID0gd29ybGRSdW4od29ybGRfZGVmLCBnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbiwgdWlMaXN0ZW5lcnMpO1xyXG4gIHNldHVwQ2FyVUkoKTtcclxuICBjd19kcmF3TWluaU1hcCgpO1xyXG4gIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZ2FtZUxvb3ApO1xyXG4gIFxyXG59XHJcblxyXG5mdW5jdGlvbiByZWxNb3VzZUNvb3JkcyhldmVudCkge1xyXG4gIHZhciB0b3RhbE9mZnNldFggPSAwO1xyXG4gIHZhciB0b3RhbE9mZnNldFkgPSAwO1xyXG4gIHZhciBjYW52YXNYID0gMDtcclxuICB2YXIgY2FudmFzWSA9IDA7XHJcbiAgdmFyIGN1cnJlbnRFbGVtZW50ID0gdGhpcztcclxuXHJcbiAgZG8ge1xyXG4gICAgdG90YWxPZmZzZXRYICs9IGN1cnJlbnRFbGVtZW50Lm9mZnNldExlZnQgLSBjdXJyZW50RWxlbWVudC5zY3JvbGxMZWZ0O1xyXG4gICAgdG90YWxPZmZzZXRZICs9IGN1cnJlbnRFbGVtZW50Lm9mZnNldFRvcCAtIGN1cnJlbnRFbGVtZW50LnNjcm9sbFRvcDtcclxuICAgIGN1cnJlbnRFbGVtZW50ID0gY3VycmVudEVsZW1lbnQub2Zmc2V0UGFyZW50XHJcbiAgfVxyXG4gIHdoaWxlIChjdXJyZW50RWxlbWVudCk7XHJcblxyXG4gIGNhbnZhc1ggPSBldmVudC5wYWdlWCAtIHRvdGFsT2Zmc2V0WDtcclxuICBjYW52YXNZID0gZXZlbnQucGFnZVkgLSB0b3RhbE9mZnNldFk7XHJcblxyXG4gIHJldHVybiB7eDogY2FudmFzWCwgeTogY2FudmFzWX1cclxufVxyXG5IVE1MRGl2RWxlbWVudC5wcm90b3R5cGUucmVsTW91c2VDb29yZHMgPSByZWxNb3VzZUNvb3JkcztcclxubWluaW1hcGhvbGRlci5vbmNsaWNrID0gZnVuY3Rpb24gKGV2ZW50KSB7XHJcbiAgdmFyIGNvb3JkcyA9IG1pbmltYXBob2xkZXIucmVsTW91c2VDb29yZHMoZXZlbnQpO1xyXG4gIHZhciBjd19jYXJBcnJheSA9IEFycmF5LmZyb20oY2FyTWFwLnZhbHVlcygpKTtcclxuICB2YXIgY2xvc2VzdCA9IHtcclxuICAgIHZhbHVlOiBjd19jYXJBcnJheVswXS5jYXIsXHJcbiAgICBkaXN0OiBNYXRoLmFicygoKGN3X2NhckFycmF5WzBdLmdldFBvc2l0aW9uKCkueCArIDYpICogbWluaW1hcHNjYWxlKSAtIGNvb3Jkcy54KSxcclxuICAgIHg6IGN3X2NhckFycmF5WzBdLmdldFBvc2l0aW9uKCkueFxyXG4gIH1cclxuXHJcbiAgdmFyIG1heFggPSAwO1xyXG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY3dfY2FyQXJyYXkubGVuZ3RoOyBpKyspIHtcclxuICAgIHZhciBwb3MgPSBjd19jYXJBcnJheVtpXS5nZXRQb3NpdGlvbigpO1xyXG4gICAgdmFyIGRpc3QgPSBNYXRoLmFicygoKHBvcy54ICsgNikgKiBtaW5pbWFwc2NhbGUpIC0gY29vcmRzLngpO1xyXG4gICAgaWYgKGRpc3QgPCBjbG9zZXN0LmRpc3QpIHtcclxuICAgICAgY2xvc2VzdC52YWx1ZSA9IGN3X2NhckFycmF5LmNhcjtcclxuICAgICAgY2xvc2VzdC5kaXN0ID0gZGlzdDtcclxuICAgICAgY2xvc2VzdC54ID0gcG9zLng7XHJcbiAgICB9XHJcbiAgICBtYXhYID0gTWF0aC5tYXgocG9zLngsIG1heFgpO1xyXG4gIH1cclxuXHJcbiAgaWYgKGNsb3Nlc3QueCA9PSBtYXhYKSB7IC8vIGZvY3VzIG9uIGxlYWRlciBhZ2FpblxyXG4gICAgY3dfc2V0Q2FtZXJhVGFyZ2V0KC0xKTtcclxuICB9IGVsc2Uge1xyXG4gICAgY3dfc2V0Q2FtZXJhVGFyZ2V0KGNsb3Nlc3QudmFsdWUpO1xyXG4gIH1cclxufVxyXG5cclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjbXV0YXRpb25yYXRlXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XHJcbiAgdmFyIGVsZW0gPSBlLnRhcmdldFxyXG4gIGN3X3NldE11dGF0aW9uKGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnZhbHVlKVxyXG59KVxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNtdXRhdGlvbnNpemVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihlKXtcclxuICB2YXIgZWxlbSA9IGUudGFyZ2V0XHJcbiAgY3dfc2V0TXV0YXRpb25SYW5nZShlbGVtLm9wdGlvbnNbZWxlbS5zZWxlY3RlZEluZGV4XS52YWx1ZSlcclxufSlcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZmxvb3JcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihlKXtcclxuICB2YXIgZWxlbSA9IGUudGFyZ2V0XHJcbiAgY3dfc2V0TXV0YWJsZUZsb29yKGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnZhbHVlKVxyXG59KTtcclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZ3Jhdml0eVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xyXG4gIHZhciBlbGVtID0gZS50YXJnZXRcclxuICBjd19zZXRHcmF2aXR5KGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnZhbHVlKVxyXG59KVxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNlbGl0ZXNpemVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihlKXtcclxuICB2YXIgZWxlbSA9IGUudGFyZ2V0XHJcbiAgY3dfc2V0RWxpdGVTaXplKGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnZhbHVlKVxyXG59KVxyXG5cclxuZnVuY3Rpb24gY3dfc2V0TXV0YXRpb24obXV0YXRpb24pIHtcclxuICBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5nZW5fbXV0YXRpb24gPSBwYXJzZUZsb2F0KG11dGF0aW9uKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc2V0TXV0YXRpb25SYW5nZShyYW5nZSkge1xyXG4gIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLm11dGF0aW9uX3JhbmdlID0gcGFyc2VGbG9hdChyYW5nZSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3NldE11dGFibGVGbG9vcihjaG9pY2UpIHtcclxuICB3b3JsZF9kZWYubXV0YWJsZV9mbG9vciA9IChjaG9pY2UgPT0gMSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3NldEdyYXZpdHkoY2hvaWNlKSB7XHJcbiAgd29ybGRfZGVmLmdyYXZpdHkgPSBuZXcgYjJWZWMyKDAuMCwgLXBhcnNlRmxvYXQoY2hvaWNlKSk7XHJcbiAgdmFyIHdvcmxkID0gY3VycmVudFJ1bm5lci5zY2VuZS53b3JsZFxyXG4gIC8vIENIRUNLIEdSQVZJVFkgQ0hBTkdFU1xyXG4gIGlmICh3b3JsZC5HZXRHcmF2aXR5KCkueSAhPSB3b3JsZF9kZWYuZ3Jhdml0eS55KSB7XHJcbiAgICB3b3JsZC5TZXRHcmF2aXR5KHdvcmxkX2RlZi5ncmF2aXR5KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3NldEVsaXRlU2l6ZShjbG9uZXMpIHtcclxuICBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5jaGFtcGlvbkxlbmd0aCA9IHBhcnNlSW50KGNsb25lcywgMTApO1xyXG59XHJcblxyXG5jd19pbml0KCk7XHJcbiIsInZhciByYW5kb20gPSByZXF1aXJlKFwiLi9yYW5kb20uanNcIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBjcmVhdGVHZW5lcmF0aW9uWmVybyhzY2hlbWEsIGdlbmVyYXRvcil7XHJcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoZnVuY3Rpb24oaW5zdGFuY2UsIGtleSl7XHJcbiAgICAgIHZhciBzY2hlbWFQcm9wID0gc2NoZW1hW2tleV07XHJcbiAgICAgIHZhciB2YWx1ZXMgPSByYW5kb20uY3JlYXRlTm9ybWFscyhzY2hlbWFQcm9wLCBnZW5lcmF0b3IpO1xyXG4gICAgICBpbnN0YW5jZVtrZXldID0gdmFsdWVzO1xyXG4gICAgICByZXR1cm4gaW5zdGFuY2U7XHJcbiAgICB9LCB7IGlkOiBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDMyKSB9KTtcclxuICB9LFxyXG4gIGNyZWF0ZUNyb3NzQnJlZWQoc2NoZW1hLCBwYXJlbnRzLCBwYXJlbnRDaG9vc2VyKXtcclxuICAgIHZhciBpZCA9IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpO1xyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGNyb3NzRGVmLCBrZXkpe1xyXG4gICAgICB2YXIgc2NoZW1hRGVmID0gc2NoZW1hW2tleV07XHJcbiAgICAgIHZhciB2YWx1ZXMgPSBbXTtcclxuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHNjaGVtYURlZi5sZW5ndGg7IGkgPCBsOyBpKyspe1xyXG4gICAgICAgIHZhciBwID0gcGFyZW50Q2hvb3NlcihpZCwga2V5LCBwYXJlbnRzKTtcclxuICAgICAgICB2YWx1ZXMucHVzaChwYXJlbnRzW3BdW2tleV1baV0pO1xyXG4gICAgICB9XHJcbiAgICAgIGNyb3NzRGVmW2tleV0gPSB2YWx1ZXM7XHJcbiAgICAgIHJldHVybiBjcm9zc0RlZjtcclxuICAgIH0sIHtcclxuICAgICAgaWQ6IGlkLFxyXG4gICAgICBhbmNlc3RyeTogcGFyZW50cy5tYXAoZnVuY3Rpb24ocGFyZW50KXtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgaWQ6IHBhcmVudC5pZCxcclxuICAgICAgICAgIGFuY2VzdHJ5OiBwYXJlbnQuYW5jZXN0cnksXHJcbiAgICAgICAgfTtcclxuICAgICAgfSlcclxuICAgIH0pO1xyXG4gIH0sXHJcbiAgY3JlYXRlTXV0YXRlZENsb25lKHNjaGVtYSwgZ2VuZXJhdG9yLCBwYXJlbnQsIGZhY3RvciwgY2hhbmNlVG9NdXRhdGUpe1xyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGNsb25lLCBrZXkpe1xyXG4gICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xyXG4gICAgICB2YXIgb3JpZ2luYWxWYWx1ZXMgPSBwYXJlbnRba2V5XTtcclxuICAgICAgdmFyIHZhbHVlcyA9IHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxyXG4gICAgICAgIHNjaGVtYVByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIGZhY3RvciwgY2hhbmNlVG9NdXRhdGVcclxuICAgICAgKTtcclxuICAgICAgY2xvbmVba2V5XSA9IHZhbHVlcztcclxuICAgICAgcmV0dXJuIGNsb25lO1xyXG4gICAgfSwge1xyXG4gICAgICBpZDogcGFyZW50LmlkLFxyXG4gICAgICBhbmNlc3RyeTogcGFyZW50LmFuY2VzdHJ5XHJcbiAgICB9KTtcclxuICB9LFxyXG4gIGFwcGx5VHlwZXMoc2NoZW1hLCBwYXJlbnQpe1xyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGNsb25lLCBrZXkpe1xyXG4gICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xyXG4gICAgICB2YXIgb3JpZ2luYWxWYWx1ZXMgPSBwYXJlbnRba2V5XTtcclxuICAgICAgdmFyIHZhbHVlcztcclxuICAgICAgc3dpdGNoKHNjaGVtYVByb3AudHlwZSl7XHJcbiAgICAgICAgY2FzZSBcInNodWZmbGVcIiA6XHJcbiAgICAgICAgICB2YWx1ZXMgPSByYW5kb20ubWFwVG9TaHVmZmxlKHNjaGVtYVByb3AsIG9yaWdpbmFsVmFsdWVzKTsgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImZsb2F0XCIgOlxyXG4gICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvRmxvYXQoc2NoZW1hUHJvcCwgb3JpZ2luYWxWYWx1ZXMpOyBicmVhaztcclxuICAgICAgICBjYXNlIFwiaW50ZWdlclwiOlxyXG4gICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvSW50ZWdlcihzY2hlbWFQcm9wLCBvcmlnaW5hbFZhbHVlcyk7IGJyZWFrO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFVua25vd24gdHlwZSAke3NjaGVtYVByb3AudHlwZX0gb2Ygc2NoZW1hIGZvciBrZXkgJHtrZXl9YCk7XHJcbiAgICAgIH1cclxuICAgICAgY2xvbmVba2V5XSA9IHZhbHVlcztcclxuICAgICAgcmV0dXJuIGNsb25lO1xyXG4gICAgfSwge1xyXG4gICAgICBpZDogcGFyZW50LmlkLFxyXG4gICAgICBhbmNlc3RyeTogcGFyZW50LmFuY2VzdHJ5XHJcbiAgICB9KTtcclxuICB9LFxyXG59XHJcbiIsIm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdGNyZWF0ZURhdGFQb2ludENsdXN0ZXI6IGNyZWF0ZURhdGFQb2ludENsdXN0ZXIsXHJcblx0Y3JlYXRlRGF0YVBvaW50OiBjcmVhdGVEYXRhUG9pbnQsXHJcblx0Y3JlYXRlQ2x1c3RlckludGVyZmFjZTogY3JlYXRlQ2x1c3RlckludGVyZmFjZSxcclxuXHRmaW5kRGF0YVBvaW50Q2x1c3RlcjogZmluZERhdGFQb2ludENsdXN0ZXIsXHJcblx0ZmluZERhdGFQb2ludDogZmluZERhdGFQb2ludCxcclxuXHRzb3J0Q2x1c3Rlcjogc29ydENsdXN0ZXIsXHJcblx0ZmluZE9qZWN0TmVpZ2hib3JzOiBmaW5kT2plY3ROZWlnaGJvcnMsXHJcblx0c2NvcmVPYmplY3Q6IHNjb3JlT2JqZWN0LFxyXG5cdGNyZWF0ZVN1YkRhdGFQb2ludENsdXN0ZXI6Y3JlYXRlU3ViRGF0YVBvaW50Q2x1c3RlclxyXG5cdFxyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVEYXRhUG9pbnRDbHVzdGVyKGNhckRhdGFQb2ludFR5cGUpe1xyXG5cdHZhciBjbHVzdGVyID0ge1xyXG5cdFx0aWQ6IGNhckRhdGFQb2ludFR5cGUsXHJcblx0XHRkYXRhQXJyYXk6IG5ldyBBcnJheSgpXHJcblx0fTtcclxuXHRyZXR1cm4gY2x1c3RlcjtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlU3ViRGF0YVBvaW50Q2x1c3RlcihjYXJEYXRhUG9pbnRUeXBlKXtcclxuXHR2YXIgY2x1c3RlciA9IHtcclxuXHRcdGlkOiBjYXJEYXRhUG9pbnRUeXBlLFxyXG5cdFx0ZGF0YUFycmF5OiBuZXcgQXJyYXkoKVxyXG5cdH07XHJcblx0cmV0dXJuIGNsdXN0ZXI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZURhdGFQb2ludChkYXRhSWQsIGRhdGFQb2ludFR5cGUsIGQsIHMpe1xyXG5cdHZhciBkYXRhUG9pbnQgPSB7XHJcblx0XHRpZDogZGF0YUlkLFxyXG5cdFx0dHlwZTogZGF0YVBvaW50VHlwZSxcclxuXHRcdGRhdGE6IGQsXHJcblx0XHRzY29yZTogc1xyXG5cdH07XHJcblx0cmV0dXJuIGRhdGFQb2ludDtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlQ2x1c3RlckludGVyZmFjZShpZCl7XHJcblx0dmFyIGNsdXN0ZXIgPSB7XHJcblx0XHRjYXJzQXJyYXk6IG5ldyBBcnJheSgpLFxyXG5cdFx0Y2x1c3RlcklEOiBpZCxcclxuXHRcdGFycmF5T2ZDbHVzdGVyczogbmV3IEFycmF5KClcclxuXHR9O1xyXG5cdHJldHVybiBjbHVzdGVyO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzb3J0Q2x1c3RlcihjbHVzdGVyKXtcclxuXHRjbHVzdGVyLnNvcnQoZnVuY3Rpb24oYSwgYil7cmV0dXJuIGEuZGF0YSAtIGIuZGF0YX0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kT2plY3ROZWlnaGJvcnMoZGF0YUlkLCBjbHVzdGVyLCByYW5nZSkge1xyXG5cdHZhciBuZWlnaGJvcnMgPSBuZXcgQXJyYXkoKTtcclxuXHR2YXIgaW5kZXggPSBjbHVzdGVyLmZpbmRJbmRleCh4PT4geC5pZD09PWRhdGFJZCk7XHJcblx0dmFyIGdvbmVQYXN0SWQgPSBmYWxzZTtcclxuXHR2YXIgY2x1c3Rlckxlbmd0aCA9IGNsdXN0ZXIubGVuZ3RoO1xyXG5cdGZvcih2YXIgaT0wO2k8cmFuZ2U7aSsrKXtcclxuXHRcdGlmKChpbmRleC1yYW5nZSk8MCl7XHJcblx0XHRcdGlmKGNsdXN0ZXJbaV0uaWQ9PT1kYXRhSWQpe2dvbmVQYXN0SWQ9dHJ1ZTt9XHJcblx0XHRcdG5laWdoYm9ycy5wdXNoKChnb25lUGFzdElkPT09ZmFsc2UpP2NsdXN0ZXJbaV06Y2x1c3RlcltpKzFdKTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYoKGluZGV4K3JhbmdlKT5jbHVzdGVyTGVuZ3RoKXtcclxuXHRcdFx0aWYoY2x1c3RlclsoY2x1c3Rlckxlbmd0aC0xKS1pXS5pZD09PWRhdGFJZCl7Z29uZVBhc3RJZD10cnVlO31cclxuXHRcdFx0bmVpZ2hib3JzLnB1c2goKGdvbmVQYXN0SWQ9PT1mYWxzZSk/Y2x1c3RlclsoY2x1c3Rlckxlbmd0aC0xKS1pXTpjbHVzdGVyWyhjbHVzdGVyTGVuZ3RoLTEpLShpKzEpXSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0aWYoY2x1c3RlcltpbmRleC0ocmFuZ2UvMikraV0uaWQ9PT1kYXRhSWQpe2dvbmVQYXN0SWQ9dHJ1ZTt9XHJcblx0XHRcdG5laWdoYm9ycy5wdXNoKChnb25lUGFzdElkPT09ZmFsc2UpP2NsdXN0ZXJbaW5kZXgtKHJhbmdlLzIpK2ldOmNsdXN0ZXJbKGluZGV4KzEpLShyYW5nZS8yKStpXSk7XHJcblx0XHR9XHJcblx0XHRcclxuXHR9XHJcblx0cmV0dXJuIG5laWdoYm9ycztcclxufVxyXG5cclxuZnVuY3Rpb24gZmluZERhdGFQb2ludENsdXN0ZXIoZGF0YUlkLCBjbHVzdGVyKXtcclxuXHRyZXR1cm4gY2x1c3Rlci5hcnJheU9mQ2x1c3RlcnMuZmluZCh4PT4geC5pZD09PWRhdGFJZCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbmREYXRhUG9pbnQoZGF0YUlkLCBjbHVzdGVyKXtcclxuXHRyZXR1cm4gY2x1c3Rlci5kYXRhQXJyYXkuZmluZChmdW5jdGlvbih2YWx1ZSl7XHJcblx0XHRyZXR1cm4gdmFsdWUuaWQ9PT1pZDtcclxuXHR9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gc2NvcmVPYmplY3QoaWQsIGNsdXN0ZXIpe1xyXG5cdHZhciBuZWlnaGJvcnMgPSBmaW5kT2plY3ROZWlnaGJvcnMoaWQsIGNsdXN0ZXIsICgoY2x1c3Rlci5sZW5ndGgvNCk8NDApPzY6NDApO1xyXG5cdHZhciBuZXdTY29yZSA9IDA7XHJcblx0Zm9yKHZhciBpPTA7aTxuZWlnaGJvcnMubGVuZ3RoO2krKyl7XHJcblx0XHRuZXdTY29yZSs9bmVpZ2hib3JzW2ldLnNjb3JlO1xyXG5cdH1cclxuXHRyZXR1cm4gbmV3U2NvcmUvbmVpZ2hib3JzLmxlbmd0aDtcclxufSIsInZhciBjbHVzdGVyID0gcmVxdWlyZShcIi4vY2x1c3Rlci5qcy9cIik7XHJcbi8vdmFyIGNhck9iamVjdHMgPSByZXF1aXJlKFwiLi9jYXItb2JqZWN0cy5qc29uXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0c2V0dXA6IHNldHVwLFxyXG5cdHJlU2NvcmVDYXJzOiByZVNjb3JlQ2Fyc1xyXG59XHJcblxyXG4vL1wid2hlZWxfcmFkaXVzXCIsIFwiY2hhc3Npc19kZW5zaXR5XCIsIFwidmVydGV4X2xpc3RcIiwgXCJ3aGVlbF92ZXJ0ZXhcIiBhbmQgXCJ3aGVlbF9kZW5zaXR5XCIvXHJcbmZ1bmN0aW9uIHNldHVwKGNhcnMsIGV4dENsdXN0ZXIsIGNsdXN0ZXJQcmVjcmVhdGVkKXtcclxuXHR2YXIgY2x1c3QgPSAoY2x1c3RlclByZWNyZWF0ZWQ9PT1mYWxzZSk/c2V0dXBEYXRhQ2x1c3RlcnMoY2x1c3Rlci5jcmVhdGVDbHVzdGVySW50ZXJmYWNlKFwibmV3Q2x1c3RlclwiKSk6IGV4dENsdXN0ZXI7XHJcblx0Zm9yKHZhciBpID0wO2k8Y2Fycy5sZW5ndGg7aSsrKXtcclxuXHRcdGlmKGNhcnNbaV0uZGVmLmVsaXRlPT09ZmFsc2Upe1xyXG5cdFx0XHRhZGRDYXJzVG9DbHVzdGVyKGNhcnNbaV0sIGNsdXN0KTtcclxuXHRcdFx0Y2x1c3QuY2Fyc0FycmF5LnB1c2goY2Fyc1tpXSk7XHJcblx0XHR9XHJcblx0fVxyXG5cdGNvbnNvbGUubG9nKGNsdXN0KTsvL3Rlc3RcclxuXHRyZXR1cm4gY2x1c3Q7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNldHVwRGF0YUNsdXN0ZXJzKG1haW5DbHVzdGVyKXtcclxuXHRtYWluQ2x1c3Rlci5hcnJheU9mQ2x1c3RlcnMucHVzaChjbHVzdGVyLmNyZWF0ZURhdGFQb2ludENsdXN0ZXIoXCJ3aGVlbF9yYWRpdXNcIikpO1xyXG5cdG1haW5DbHVzdGVyLmFycmF5T2ZDbHVzdGVycy5wdXNoKGNsdXN0ZXIuY3JlYXRlRGF0YVBvaW50Q2x1c3RlcihcImNoYXNzaXNfZGVuc2l0eVwiKSk7XHJcblx0bWFpbkNsdXN0ZXIuYXJyYXlPZkNsdXN0ZXJzLnB1c2goY2x1c3Rlci5jcmVhdGVEYXRhUG9pbnRDbHVzdGVyKFwid2hlZWxfdmVydGV4XCIpKTtcclxuXHRtYWluQ2x1c3Rlci5hcnJheU9mQ2x1c3RlcnMucHVzaChjbHVzdGVyLmNyZWF0ZURhdGFQb2ludENsdXN0ZXIoXCJ2ZXJ0ZXhfbGlzdFwiKSk7XHJcblx0bWFpbkNsdXN0ZXIuYXJyYXlPZkNsdXN0ZXJzLnB1c2goY2x1c3Rlci5jcmVhdGVEYXRhUG9pbnRDbHVzdGVyKFwid2hlZWxfZGVuc2l0eVwiKSk7XHJcblx0cmV0dXJuIG1haW5DbHVzdGVyO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhZGRDYXJzVG9DbHVzdGVyKGNhciwgY2x1c3Qpe1xyXG5cdGFkZERhdGFUb0NsdXN0ZXIoY2FyLmRlZi5pZCwgY2FyLmRlZi53aGVlbF9yYWRpdXMsY2FyLnNjb3JlLnMsIGNsdXN0ZXIuZmluZERhdGFQb2ludENsdXN0ZXIoXCJ3aGVlbF9yYWRpdXNcIiwgY2x1c3QpKTtcclxuICAgIGFkZERhdGFUb0NsdXN0ZXIoY2FyLmRlZi5pZCwgY2FyLmRlZi5jaGFzc2lzX2RlbnNpdHksY2FyLnNjb3JlLnMsIGNsdXN0ZXIuZmluZERhdGFQb2ludENsdXN0ZXIoXCJjaGFzc2lzX2RlbnNpdHlcIiwgY2x1c3QpKTtcclxuXHRhZGREYXRhVG9DbHVzdGVyKGNhci5kZWYuaWQsIGNhci5kZWYudmVydGV4X2xpc3QsY2FyLnNjb3JlLnMsIGNsdXN0ZXIuZmluZERhdGFQb2ludENsdXN0ZXIoXCJ2ZXJ0ZXhfbGlzdFwiLCBjbHVzdCkpO1xyXG5cdGFkZERhdGFUb0NsdXN0ZXIoY2FyLmRlZi5pZCwgY2FyLmRlZi53aGVlbF92ZXJ0ZXgsY2FyLnNjb3JlLnMsIGNsdXN0ZXIuZmluZERhdGFQb2ludENsdXN0ZXIoXCJ3aGVlbF92ZXJ0ZXhcIiwgY2x1c3QpKTtcclxuXHRhZGREYXRhVG9DbHVzdGVyKGNhci5kZWYuaWQsIGNhci5kZWYud2hlZWxfZGVuc2l0eSxjYXIuc2NvcmUucywgY2x1c3Rlci5maW5kRGF0YVBvaW50Q2x1c3RlcihcIndoZWVsX2RlbnNpdHlcIiwgY2x1c3QpKTtcclxufVxyXG5cclxuZnVuY3Rpb24gYWRkRGF0YVRvQ2x1c3RlcihpZCwgY2FyRGF0YSwgc2NvcmUsIGNsdXN0KXtcclxuXHRpZihjbHVzdC5kYXRhQXJyYXkubGVuZ3RoPT09Y2FyRGF0YS5sZW5ndGgpe1xyXG5cdFx0Zm9yKHZhciB4PTA7eDxjYXJEYXRhLmxlbmd0aDt4Kyspe1xyXG5cdFx0XHRjbHVzdC5kYXRhQXJyYXlbeF0uZGF0YUFycmF5LnB1c2goY2x1c3Rlci5jcmVhdGVEYXRhUG9pbnQoaWQsIFwiXCIsIGNhckRhdGFbeF0sIHNjb3JlKSk7XHJcblx0XHRcdGNsdXN0ZXIuc29ydENsdXN0ZXIoY2x1c3QuZGF0YUFycmF5W3hdLmRhdGFBcnJheSk7XHJcblx0XHR9XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0Zm9yKHZhciBpPTA7aTxjYXJEYXRhLmxlbmd0aDtpKyspe1xyXG5cdFx0XHR2YXIgbmV3Q2x1c3QgPSBjbHVzdGVyLmNyZWF0ZVN1YkRhdGFQb2ludENsdXN0ZXIoXCJcIik7XHJcblx0XHRcdG5ld0NsdXN0LmRhdGFBcnJheS5wdXNoKGNsdXN0ZXIuY3JlYXRlRGF0YVBvaW50KGlkLCBcIlwiLCBjYXJEYXRhW2ldLCBzY29yZSkpO1xyXG5cdFx0XHRjbHVzdC5kYXRhQXJyYXkucHVzaChuZXdDbHVzdCk7XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG5mdW5jdGlvbiByZVNjb3JlQ2FycyhjYXJzLCBjbHVzdCl7XHJcblx0Zm9yKHZhciBpPTA7aTxjYXJzLmxlbmd0aDtpKyspe1xyXG5cdFx0dmFyIHNjb3JlID0gMDtcclxuXHRcdGZvcih2YXIgeD0wO3g8Y2x1c3QuYXJyYXlPZkNsdXN0ZXJzLmxlbmd0aDt4Kyspe1xyXG5cdFx0XHRmb3IodmFyIHk9MDt5PGNsdXN0LmFycmF5T2ZDbHVzdGVyc1t4XS5kYXRhQXJyYXkubGVuZ3RoO3krKyl7XHJcblx0XHRcdFx0c2NvcmUgKz0gY2x1c3Rlci5zY29yZU9iamVjdChjYXJzW2ldLmRlZi5pZCwgY2x1c3QuYXJyYXlPZkNsdXN0ZXJzW3hdLmRhdGFBcnJheVt5XS5kYXRhQXJyYXkpO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRjYXJzW2ldLnNjb3JlLnMgKz0gc2NvcmUvY2x1c3QuYXJyYXlPZkNsdXN0ZXJzLmxlbmd0aDtcclxuXHR9XHJcbn1cclxuXHJcbiIsIi8qdmFyIHJhbmRvbUludCA9IHJlcXVpcmUoXCIuL3JhbmRvbUludC5qcy9cIik7XHJcbnZhciBnZXRSYW5kb21JbnQgPSByYW5kb21JbnQuZ2V0UmFuZG9tSW50OyovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRydW5Dcm9zc292ZXI6IHJ1bkNyb3Nzb3ZlclxyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gY3JlYXRlcyB0aGUgYWN1YWwgbmV3IGNhciBhbmQgcmV0dXJuZWQuIFRoZSBmdW5jdGlvbiBydW5zIGEgb25lLXBvaW50IGNyb3Nzb3ZlciB0YWtpbmcgZGF0YSBmcm9tIHRoZSBwYXJlbnRzIHBhc3NlZCB0aHJvdWdoIGFuZCBhZGRpbmcgdGhlbSB0byB0aGUgbmV3IGNhci5cclxuQHBhcmFtIHBhcmVudHMgT2JqZWN0QXJyYXkgLSBEYXRhIGlzIHRha2VuIGZyb20gdGhlc2UgY2FycyBhbmQgYWRkZWQgdG8gdGhlIG5ldyBjYXIgdXNpbmcgY3Jvc3NvdmVyLlxyXG5AcGFyYW0gc2NoZW1hIC0gVGhlIGRhdGEgb2JqZWN0cyB0aGF0IGNhciBvYmplY3RzIGhhdmUgc3VjaCBhcyBcIndoZWVsX3JhZGl1c1wiLCBcImNoYXNzaXNfZGVuc2l0eVwiLCBcInZlcnRleF9saXN0XCIsIFwid2hlZWxfdmVydGV4XCIgYW5kIFwid2hlZWxfZGVuc2l0eVwiXHJcbkBwYXJhbSBub0Nyb3Nzb3ZlclBvaW50IGludCAtIFRoZSBmaXJzdCBjcm9zc292ZXIgcG9pbnQgcmFuZG9tbHkgZ2VuZXJhdGVkXHJcbkBwYXJhbSBub0Nyb3Nzb3ZlclBvaW50VHdvIGludCAtIFRoZSBzZWNvbmQgY3Jvc3NvdmVyIHBvaW50IHJhbmRvbWx5IGdlbmVyYXRlZCBcclxuQHBhcmFtIGNhck5vIGludCAtIHdoZXRoZXIgdGhpcyBjYXIgaXMgdGhlIGZpcnN0IG9yIHNlY29uZCBjaGlsZCBmb3IgdGhlIHBhcmVudCBjYXJzXHJcbkBwYXJhbSBwYXJlbnRTY29yZSBpbnQgLSBUaGUgYXZlcmFnZSBzY29yZSBvZiB0aGUgdHdvIHBhcmVudHNcclxuQHBhcmFtIG5vQ2Fyc0NyZWF0ZWQgaW50IC0gVGhlIG51bWJlciBvZiBjYXJzIGNyZWF0ZWQgc28gZmFyLCB1c2VkIGZvciB0aGUgbmV3IGNhcnMgaWRcclxuQHBhcmFtIGNyb3Nzb3ZlclR5cGUgaW50IC0gVGhlIHR5cGUgb2YgY3Jvc3NvdmVyIHRvIHVzZSBzdWNoIGFzIDEgZm9yIE9uZSBwb2ludCBjcm9zc292ZXIgYW55IG90aGVyIFR3byBwb2ludCBjcm9zc292ZXJcclxuQHJldHVybiBjYXIgT2JqZWN0IC0gQSBjYXIgb2JqZWN0IGlzIGNyZWF0ZWQgYW5kIHJldHVybmVkKi9cclxuZnVuY3Rpb24gY29tYmluZURhdGEocGFyZW50cywgc2NoZW1hLCBub0Nyb3Nzb3ZlclBvaW50LCBub0Nyb3Nzb3ZlclBvaW50VHdvLCBjYXJObywgcGFyZW50U2NvcmUsbm9DYXJzQ3JlYXRlZCwgY3Jvc3NvdmVyVHlwZSl7XHJcblx0dmFyIGlkID0gbm9DYXJzQ3JlYXRlZCtjYXJObztcclxuXHR2YXIga2V5SXRlcmF0aW9uID0gMDtcclxuXHRyZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoZnVuY3Rpb24oY3Jvc3NEZWYsIGtleSl7XHJcbiAgICAgIHZhciBzY2hlbWFEZWYgPSBzY2hlbWFba2V5XTtcclxuICAgICAgdmFyIHZhbHVlcyA9IFtdO1xyXG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gc2NoZW1hRGVmLmxlbmd0aDsgaSA8IGw7IGkrKyl7XHJcbiAgICAgICAgdmFyIHAgPSBjcm9zc292ZXIoY2FyTm8sIG5vQ3Jvc3NvdmVyUG9pbnQsIG5vQ3Jvc3NvdmVyUG9pbnRUd28sIGtleUl0ZXJhdGlvbiwgY3Jvc3NvdmVyVHlwZSk7XHJcbiAgICAgICAgdmFsdWVzLnB1c2gocGFyZW50c1twXVtrZXldW2ldKTtcclxuICAgICAgfVxyXG4gICAgICBjcm9zc0RlZltrZXldID0gdmFsdWVzO1xyXG5cdCAga2V5SXRlcmF0aW9uKys7XHJcbiAgICAgIHJldHVybiBjcm9zc0RlZjtcclxuICAgIH0gLCB7XHJcblx0XHRpZDogaWQsXHJcblx0XHRwYXJlbnRzU2NvcmU6IHBhcmVudFNjb3JlXHJcblx0fSk7XHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiBjaG9vc2VzIHdoaWNoIGNhciB0aGUgZGF0YSBpcyB0YWtlbiBmcm9tIGJhc2VkIG9uIHRoZSBwYXJhbWV0ZXJzIGdpdmVuIHRvIHRoZSBmdW5jdGlvblxyXG5AcGFyYW0gY2FyTm8gaW50IC0gVGhpcyBpcyB0aGUgbnVtYmVyIG9mIHRoZSBjYXIgYmVpbmcgY3JlYXRlZCBiZXR3ZWVuIDEtMiwgZmlsdGVycyBjYXJzIGRhdGEgaXMgYmVpbmcgdGFrZW5cclxuQHBhcmFtIG5vQ3Jvc3NvdmVyUG9pbnQgaW50IC0gVGhlIGZpcnN0IGNyb3Nzb3ZlciBwb2ludCB3aGVyZSBkYXRhIGJlZm9yZSBvciBhZnRlciB0aGUgcG9pbnQgaXMgdGFrZW5cclxuQHBhcmFtIG5vQ3Jvc3NvdmVyUG9pbnRUd28gaW50IC0gVGhlIHNlY29uZCBjcm9zc292ZXIgcG9pbnQgd2hlcmUgZGF0YSBpcyBiZWZvcmUgb3IgYWZ0ZXIgdGhlIHBvaW50IGlzIHRha2VuXHJcbkBwYXJhbSBrZXlJdGVyYXRpb24gaW50IC0gVGhpcyBpcyB0aGUgcG9pbnQgYXQgd2hpY2ggdGhlIGNyb3Nzb3ZlciBpcyBjdXJyZW50bHkgYXQgd2hpY2ggaGVscCBzcGVjaWZpZXMgd2hpY2ggY2FycyBkYXRhIGlzIHJlbGF2ZW50IHRvIHRha2UgY29tcGFyaW5nIHRoaXMgcG9pbnQgdG8gdGhlIG9uZS90d28gY3Jvc3NvdmUgcG9pbnRzXHJcbkBwYXJhbSBjcm9zc292ZVR5cGUgaW50IC0gVGhpcyBzcGVjaWZpZXMgaWYgb25lIHBvaW50KDEpIG9yIHR3byBwb2ludCBjcm9zc292ZXIoYW55IGludCkgaXMgdXNlZFxyXG5AcmV0dXJuIGludCAtIFdoaWNoIHBhcmVudCBkYXRhIHNob3VsZCBiZSB0YWtlbiBmcm9tIGlzIHJldHVybmVkIGVpdGhlciAwIG9yIDEqL1xyXG5mdW5jdGlvbiBjcm9zc292ZXIoY2FyTm8sIG5vQ3Jvc3NvdmVyUG9pbnQsIG5vQ3Jvc3NvdmVyUG9pbnRUd28sa2V5SXRlcmF0aW9uLGNyb3Nzb3ZlclR5cGUpe1xyXG5cdGlmKGNyb3Nzb3ZlclR5cGU9PT0xKXsgLy9ydW4gb25lLXBvaW50IGNyb3Nzb3ZlclxyXG5cdFx0cmV0dXJuIChjYXJObz09PTEpPyhrZXlJdGVyYXRpb24+PW5vQ3Jvc3NvdmVyUG9pbnQpPzA6MTooa2V5SXRlcmF0aW9uPj1ub0Nyb3Nzb3ZlclBvaW50KT8xOjA7Ly8gaGFuZGxlcyB0aGUgZml4ZWQgb25lLXBvaW50IHN3aXRjaCBvdmVyXHJcblx0fVxyXG5cdGVsc2UgeyAvL3J1biB0d28tcG9pbnQgY3Jvc3NvdmVyXHJcblx0XHRpZihjYXJObz09PTEpe1xyXG5cdFx0XHRpZigoKGtleUl0ZXJhdGlvbj5ub0Nyb3Nzb3ZlclBvaW50KSYmKGtleUl0ZXJhdGlvbjxub0Nyb3Nzb3ZlclBvaW50VHdvKSl8fCgoa2V5SXRlcmF0aW9uPm5vQ3Jvc3NvdmVyUG9pbnRUd28pJiYoa2V5SXRlcmF0aW9uPG5vQ3Jvc3NvdmVyUG9pbnQpKSl7XHJcblx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7IHJldHVybiAxO31cclxuXHRcdH1cclxuXHRcdGVsc2V7XHJcblx0XHRcdGlmKCgoa2V5SXRlcmF0aW9uPm5vQ3Jvc3NvdmVyUG9pbnQpJiYoa2V5SXRlcmF0aW9uPG5vQ3Jvc3NvdmVyUG9pbnRUd28pKXx8KChrZXlJdGVyYXRpb24+bm9Dcm9zc292ZXJQb2ludFR3bykmJihrZXlJdGVyYXRpb248bm9Dcm9zc292ZXJQb2ludCkpKXtcclxuXHRcdFx0XHRyZXR1cm4gMTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHsgcmV0dXJuIDA7fVxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHJhbmRvbWx5IGdlbmVyYXRlcyB0d28gY3Jvc3NvdmVyIHBvaW50cyBhbmQgcGFzc2VzIHRoZW0gdG8gdGhlIGNyb3Nzb3ZlciBmdW5jdGlvblxyXG5AcGFyYW0gcGFyZW50cyBPYmplY3RBcnJheSAtIEFuIGFycmF5IG9mIHRoZSBwYXJlbnRzIG9iamVjdHNcclxuQHBhcmFtIGNyb3Nzb3ZlclRweWUgaW50IC0gU3BlY2lmaWVkIHdoaWNoIGNyb3Nzb3ZlciBzaG91bGQgYmUgdXNlZFxyXG5AcGFyYW0gc2NoZW1hIC0gQ2FyIG9iamVjdCBkYXRhIHRlbXBsYXRlIHVzZWQgZm9yIGNhciBjcmVhdGlvblxyXG5AcGFyYW0gcGFyZW50U2NvcmUgaW50IC0gQXZlcmFnZSBudW1iZXIgb2YgdGhlIHBhcmVudHMgc2NvcmVcclxuQHBhcmFtIG5vQ2Fyc0NyZWF0ZWQgaW50IC0gbnVtYmVyIG9mIGNhcnMgY3JlYXRlZCBmb3IgdGhlIHNpbXVsYXRpb25cclxuQHBhcmFtIG5vQ2Fyc1RvQ3JlYXRlIGludCAtIHRoZSBudW1iZXIgb2YgbmV3IGNhcnMgdGhhdCBzaG91bGQgYmUgY3JlYXRlZCB2aWEgY3Jvc3NvdmVyXHJcbkByZXR1cm4gY2FyIE9iamVjdEFycmF5IC0gQW4gYXJyYXkgb2YgbmV3bHkgY3JlYXRlZCBjYXJzIGZyb20gdGhlIGNyb3Nzb3ZlciBhcmUgcmV0dXJuZWQqL1xyXG5mdW5jdGlvbiBydW5Dcm9zc292ZXIocGFyZW50cyxjcm9zc292ZXJUeXBlLHNjaGVtYSwgcGFyZW50c1Njb3JlLG5vQ2Fyc0NyZWF0ZWQsIG5vQ2Fyc1RvQ3JlYXRlKXtcclxuXHR2YXIgbmV3Q2FycyA9IG5ldyBBcnJheSgpO1xyXG5cdHZhciBjcm9zc292ZXJQb2ludE9uZT1nZXRSYW5kb21JbnQoMCw0LCBuZXcgQXJyYXkoKSk7XHJcblx0dmFyIGNyb3Nzb3ZlclBvaW50VHdvPWdldFJhbmRvbUludCgwLDQsIFtjcm9zc292ZXJQb2ludE9uZV0pO1xyXG5cdGZvcih2YXIgaT0wO2k8bm9DYXJzVG9DcmVhdGU7aSsrKXtcclxuXHRcdG5ld0NhcnMucHVzaChjb21iaW5lRGF0YShwYXJlbnRzLHNjaGVtYSwgY3Jvc3NvdmVyUG9pbnRPbmUsIGNyb3Nzb3ZlclBvaW50VHdvLCBpLCBwYXJlbnRzU2NvcmUsbm9DYXJzQ3JlYXRlZCxjcm9zc292ZXJUeXBlKSk7XHJcblx0fVxyXG5cdHJldHVybiBuZXdDYXJzO1xyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gcmV0dXJucyB3aG9sZSBpbnRzIGJldHdlZW4gYSBtaW5pbXVtIGFuZCBtYXhpbXVtXHJcbkBwYXJhbSBtaW4gaW50IC0gVGhlIG1pbmltdW0gaW50IHRoYXQgY2FuIGJlIHJldHVybmVkXHJcbkBwYXJhbSBtYXggaW50IC0gVGhlIG1heGltdW0gaW50IHRoYXQgY2FuIGJlIHJldHVybmVkXHJcbkBwYXJhbSBub3RFcXVhbHNBcnIgaW50QXJyYXkgLSBBbiBhcnJheSBvZiB0aGUgaW50cyB0aGF0IHRoZSBmdW5jdGlvbiBzaG91bGQgbm90IHJldHVyblxyXG5AcmV0dXJuIGludCAtIFRoZSBpbnQgd2l0aGluIHRoZSBzcGVjaWZpZWQgcGFyYW1ldGVyIGJvdW5kcyBpcyByZXR1cm5lZC4qL1xyXG5mdW5jdGlvbiBnZXRSYW5kb21JbnQobWluLCBtYXgsIG5vdEVxdWFsc0Fycikge1xyXG5cdHZhciB0b1JldHVybjtcclxuXHR2YXIgcnVuTG9vcCA9IHRydWU7XHJcblx0d2hpbGUocnVuTG9vcD09PXRydWUpe1xyXG5cdFx0bWluID0gTWF0aC5jZWlsKG1pbik7XHJcblx0XHRtYXggPSBNYXRoLmZsb29yKG1heCk7XHJcblx0XHR0b1JldHVybiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XHJcblx0XHRpZih0eXBlb2YgZmluZElmRXhpc3RzID09PSBcInVuZGVmaW5lZFwiKXtcclxuXHRcdFx0cnVuTG9vcD1mYWxzZTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYobm90RXF1YWxzQXJyLmZpbmQoZnVuY3Rpb24odmFsdWUpe3JldHVybiB2YWx1ZT09PXRvUmV0dXJuO30pPT09ZmFsc2Upe1xyXG5cdFx0XHRydW5Mb29wPWZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuICAgIHJldHVybiB0b1JldHVybjsvLyh0eXBlb2YgZmluZElmRXhpc3RzID09PSBcInVuZGVmaW5lZFwiKT90b1JldHVybjpnZXRSYW5kb21JbnQobWluLCBtYXgsIG5vdEVxdWFsc0Fycik7XHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHM9e1wibmFtZVwiOlwib2JqZWN0c1wiLFwiYXJyYXlcIjpbe1wiaWRcIjpcIjAuaGRmNXFuN3ZybVwiLFwid2hlZWxfcmFkaXVzXCI6WzAuNTc2NzY5MDgyNDcyMTI0OCwwLjQxNzcyODYxNTQ0NzY4MzZdLFwid2hlZWxfZGVuc2l0eVwiOlswLjA1ODA1ODI4NDk5MzIyNzYzLDAuNTU1ODQ4NTAyOTIxODIxNl0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4wMTc0NjkyMjQ4MjgzMDYxNV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjc5NDE1NDYwMjc1MzE3OTQsMC4zMzg2MTA1ODMxMzQxODM0NiwwLjk4MTc5NjY3MjczNTA4ODYsMC4wNDA1ODM5MTg5OTAzOTQ3MSwwLjY3OTI3NjQ4NDAwODQ1NzcsMC43MDk1NTE2ODMzNDI5ODY5LDAuNDQ0MjkyOTY4OTc4NjAzNywwLjM3MTU5NzA5NjMzOTc4MTQ0LDAuNDg2NTU0OTEzODk4MDczMTUsMC44MTk0ODk3NDM0Njc5OTQ5LDAuMDY3OTEyOTI3NjI5MjIyNTIsMC44NTAwNjE3MTg3OTgxMjAxXSxcIndoZWVsX3ZlcnRleFwiOlswLjMxOTc0NTQ4MzM4MDQ4MDUsMC4wNzMwNjgzMjU1MzQ0MzUzMiwwLjk2OTY2ODAyMjEzMjE5MTgsMC4yODI0MjkxNDQ2Mjg4Njg1LDAuMjM4MDEwODQzNTM1NjI2MywwLjAzNDIwMTYzNjUyODUwMDA2LDAuMzkzMDIwNDQ3ODQ5NDAxNSwwLjkyOTI1ODkwMjYxNjg2MDVdLFwiaW5kZXhcIjowfSx7XCJpZFwiOlwiMC5kZHZxbzljNHU1XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4wNzYyNzMxMTY1MzY5MDMwNSwwLjM4MDc3NTY1ODI0NzA2MzgzXSxcIndoZWVsX2RlbnNpdHlcIjpbMC4wMTg2MzY5Nzg4MTA4NjQ2OCwwLjAyNjg2NDM2MTc4OTMxMDI4N10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC43MDQ1NTY4NTk2OTY5ODE4XSxcInZlcnRleF9saXN0XCI6WzAuODgyNzgzNjczODQ1MTQxMywwLjQxOTA2MTc0OTM0OTk5ODQsMC4wMTcxNDc2MjY4NDQ0MTcwNjMsMC4yMjc3NTUzNTM0NTI1MjAzLDAuOTM5MTg1MjMwMDU2MjM5MSwwLjQxNjIzNTM1MDQ3NDc5OTc2LDAuNjY3ODc0Mjk2NjU1NDIzLDAuMzE4NDkzNjA5Mjk4NDIyMywwLjg4NTYwMTc5MjI2MzIxNCwwLjEzNDY1Mzk4MTE2MjM5NjgsMC4zMjIzODUzMDM4NzI0ODgsMC4xNjE0MDc0NzIzOTY5MDFdLFwid2hlZWxfdmVydGV4XCI6WzAuMTcyMDY2MjUxNjcxODI1NDMsMC4yODY0MzA2Mjc3NTAyMDYyLDAuOTM4NTEzODg1OTM4OTYxNywwLjcxMjA1MTYzNDY3ODk3MDMsMC40NzY4MTg0MTc3NjMwMTIxNSwwLjk1NzM0MjAwNTczNzE2MTUsMC4zNDc3OTY1NzYwMzQxOTA1NiwwLjQ5NDI0MjgwMDEzNjk1MDFdLFwiaW5kZXhcIjoxfSx7XCJpZFwiOlwiMC5pNThlaWN1b2dwXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC44Nzk3NzQyMjAyNzkzNjkyLDAuNDk0NjA5MDA0MTcwMTY2M10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNjkwNzcxNTcwMDIzOTU2MywwLjM1NDMyOTg0OTkzNTYxNTU2XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjk5NzEwOTc2MzkzNTg1OTddLFwidmVydGV4X2xpc3RcIjpbMC4zMzU1OTM5NzY2Nzk1Njg2LDAuMzY3NzAzNTYxNjEyMDk5NiwwLjI1MjIxMDE3NDA4MTMxNDc0LDAuNjA0MjEzNTcxODE2NDM1LDAuMTQzMDMwMzY5NzY1MTc0NywwLjY3MDc0MTQ1Mzg1MDEzNDQsMC43OTc2NDEwNzkwNTg1Nzk3LDAuMDAzMzA0MDE5MzE1NzU4Mjk5OCwwLjQ4MjI1ODY0NTAwNTMwMDM2LDAuOTcyMjQ2MzQ5MDczOTg2MywwLjEzMzI2Njg1MTkwNjE4ODE0LDAuMjQ1MTE4NjM2ODE4NjMyNjZdLFwid2hlZWxfdmVydGV4XCI6WzAuOTEzNDYzMjU3Njc2MzM1NSwwLjgwMjg1NTcxNzkyMzEzNTMsMC4wNjUyMDg4NzYwMjAwMjY0NSwwLjUwMDg3ODQ4NDE3NTM0MTgsMC4yOTY2MDgyMjk2NDkyOTczNCwwLjgyNjg4NDc5NzA0OTkzMzMsMC43MDM1MTA3NzI2NzY4Nzc5LDAuMDIwMTQ5MTU2NzIwMzExMTQ1XSxcImluZGV4XCI6Mn0se1wiaWRcIjpcIjAuZ3V0ajc2YTg4ZlwiLFwid2hlZWxfcmFkaXVzXCI6WzAuOTI5MzIyOTE3OTgyMTk4NSwwLjE0MDk2MDE4ODA2NDI5NzIyXSxcIndoZWVsX2RlbnNpdHlcIjpbMC45NjEwNjY4NzQxNzg0NDUyLDAuMTI5MTg5MzUwNDU1NDQ2MjJdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNDQxMjkzODYxMjc3NDc3M10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjUwOTY2NjI4NTM5MDEyNywwLjA0NDA0MjQ3MDM3MTg4MzgsMC4zMjM1NTUxNDYxNTQ4MTA5NiwwLjUwMjg1NjA0OTE0Njc4MzcsMC44ODU1NTI1NjExODQ2ODg2LDAuNjYzNDc0NzYzMzkwODgxNywwLjA1MzcyMDEzNTQ3OTcyNTIwNiwwLjAzOTM5OTE5MTEzNDczNTc4LDAuODY1OTEzMDQ3OTk4ODAzMywwLjUyOTI2MTAxOTExNTU3OTMsMC4yNTg0NDk3NDQxMTczMzk0NSwwLjE1Njc0OTUzNTkzMzA1ODYzXSxcIndoZWVsX3ZlcnRleFwiOlswLjEwOTIyNTI5Nzk4NTQ2NzU0LDAuODY5NzY3MDc1MDQ2MTI2OCwwLjgzMDgwNzk0NTk4NzczMTMsMC42MzgzMTAyNzY2MTk3NTI4LDAuNzA5OTk2OTg1ODA5NjI5NiwwLjUzODk1MDk3NDUxMTE0MjMsMC44OTc4Mzc2MzMxOTYxMTI5LDAuNjQyMDY2NDUwMTA4NTg4NF0sXCJpbmRleFwiOjN9LHtcImlkXCI6XCIwLnMwcWI4Z2QxdWs4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC43MjE5ODY1OTQxMDUwMDAzLDAuODc0OTIyODc2NDg5ODYyN10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuODg4ODgyNzMxOTczNDQ2NywwLjM2MzM3ODA5NzIyODQ4MTddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNzgxMTUxNDM0MTc4ODk3Ml0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjA3MTAyOTgyNTE5MDIyMjYsMC4wNDc3NzgzOTkyMTc2MDc5NiwwLjEzMjU4ODgzODg5OTM4MDU2LDAuOTc2NjY0NzY3MzMwNjg1NiwwLjU0MDAzOTkzMzY3MjU3MDcsMC4wMDk0OTAzMDMyNzE1ODE4NDYsMC42MTA1NjE4MzQ1MjkzNjAyLDAuMzA3Njk2ODQwNjQ2Mjg5NDQsMC45NTM2ODIyMTMwMzYxMzc1LDAuNjYwODk2MDk4MTU3Mzg3MywwLjM4Nzg4NzY2ODQxMjM1MzU2LDAuMTQ2OTgyMTEyNzM1MTUxMTZdLFwid2hlZWxfdmVydGV4XCI6WzAuNDU3OTYwNTUzOTgxMTk3MDYsMC41MDgyMzg0MDA1Mzg3OTE0LDAuNjkxMDA3MDYzNzMzOTUyNywwLjQ5NDkxNDgwNTc2MTk1MDU3LDAuMDE3NTY0OTgzMDU2NjY5NTM2LDAuOTAwNDE4NzEyMTkzOTIzNiwwLjk1MDg4ODE0OTQ0Mzc3OCwwLjMxNDU3NzE4Nzk5ODMxMzldLFwiaW5kZXhcIjo0fSx7XCJpZFwiOlwiMC5hbTUwc2tmaWZ2OFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuNDM3MTc4MjE1MTcwNTAxNywwLjE2OTM0NDA3NTI4NjY5NTkzXSxcIndoZWVsX2RlbnNpdHlcIjpbMC41MTU1NjE1NTMwMzgyNDQ1LDAuMzc0NjM5ODYyNjU1ODQ4N10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC45Nzc3ODMxMDEwMzk4NTc5XSxcInZlcnRleF9saXN0XCI6WzAuNDIxODI1NDMzMjkxODQwMywwLjEzNDAyOTkxOTc5Nzk4NTk1LDAuNTY3OTUyMzgzMzgwNDI2MSwwLjk5ODYzNjA0NTQ3MTIxMzEsMC4xMzcwMjI2NTI5MDQ5NzE0LDAuNjg2NjIyNjcyMzk5NDMwOSwwLjIxMDg1MDY2NzIyODU4MTQ4LDAuMTEyMDEyODEwMzYzNDc4NTQsMC42NDU4ODY4MDgzODk2MjQzLDAuNzY4NjM0OTE3OTE5MjU5NSwwLjU2MzEyNzk0MTA4MzMwNzcsMC44OTI5NTI3ODcwMjc3Mzk0XSxcIndoZWVsX3ZlcnRleFwiOlswLjMyMDEzMDA0NjMzOTMxMDIsMC43ODgxMzA0Nzg1Mjk3NjY5LDAuMTk5NDYyMjY2Mzg3MDk1MywwLjUzNjEzMTI0NzA3OTA1MjIsMC45MzcyODQ0NzA0MzI3MDc3LDAuNjAyOTU2NjEwOTIwNzkzMSwwLjY2NTQ5NTk5MjAzOTE4MjEsMC4yNTQ0MDc1NjA3OTIwOTE3XSxcImluZGV4XCI6NX0se1wiaWRcIjpcIjAubWpjZzlmZW1hbmdcIixcIndoZWVsX3JhZGl1c1wiOlswLjYwNzUyODYxNzg5OTYzMzUsMC4wMjg5MzIzNTA4NzgyOTk5M10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNjg4MTE3MTA4OTIwNTU0OSwwLjM2ODEzNjkwMzA1MTc3NjI3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjkxOTQ3NDM2Njc5NDc5MzFdLFwidmVydGV4X2xpc3RcIjpbMC45MDQ1NjY2OTA4MTMyODgxLDAuMDMxNzAxNDQ5MzA0NzgwMjUsMC4zMzM4NDEzMDAyMTM3NDA2LDAuNzg0ODE3MDM4NTQwODI2NiwwLjg4MzI0MDc3NzIyNDI4MTYsMC44MjY1MzM0NzE4NzY5MTQ0LDAuOTYyOTY5NTUzMTI0NDIyOSwwLjI3MzYwNDE0MDIwOTIxOTEsMC44MDg4MDg3NDQ5NzYzODAxLDAuNDEwNzYxMDczMTI3OTQ1NjMsMC44MjE3OTk2NjMzNjc5NzA1LDAuMTQ4MzcwMjM2NTIzMTczNl0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4xMTQ4MDc4MTc0MzUxMzEwMiwwLjE2OTczNjg5OTQ5NzcxNzMsMC4yMjk4NjQxNTkyMjA1NDUyNiwwLjk1MTE1MzY1NDYzNzUzNTcsMC43ODA5MjMxMjkyMzkxNDUsMC43OTEwMjY4Mzg5NjYzODI4LDAuMzQ1NjEwMzQ2NDc3NjI3NywwLjk2MTM4NTk3NzY1Mjc5MDddLFwiaW5kZXhcIjo2fSx7XCJpZFwiOlwiMC5pZGZqdmU2Zjh0OFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuNTQxMTU1OTU4MTQ5NTE3MywwLjQ0MTI1MDUzMDQ4MDg5MDQ3XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4yNTkwOTg3NTQ5MjgyNjI4NCwwLjQ3MDIxMzk5MDY5NDU2MzI3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjM2MTM3MjgyMDIyODUwMTZdLFwidmVydGV4X2xpc3RcIjpbMC40MTAyMTM5MTU0NDI2OTMxNCwwLjk4ODE5MzI5Njk3Njk1ODksMC40OTg0NzExNDg1OTU1NDg4NiwwLjM3MzE5NzY4NzY4ODA1OTgzLDAuMDA1MDAyNTEzNDc3OTI5OTA0LDAuNDg5OTM5OTQ1NTA3Mzc2NzQsMC45NjcyNzU2ODI0MDExNjgxLDAuNjEwOTI3MTE3MzkyNywwLjY2OTgwMTQ3NTEyMzg4NzIsMC45OTczNjkwMjgwOTUwMDY3LDAuMTk0NDM2MzI4Njk0NDYyMTUsMC4wNDc2NTg0NzA1NTA0NTQxMzVdLFwid2hlZWxfdmVydGV4XCI6WzAuMjg2NDI3MDc0NDgwNTQ4NiwwLjE5MDQwMDgzODA2MTEyODYyLDAuNzcxOTU0NzYxODIwNzY3NiwwLjMxMzA2ODgwMjM5OTI0MjMsMC41NTI5OTE2MzY0MjU5MjAyLDAuOTEzMzQzNDgwODM3NjYxOSwwLjQ3MTE1MjkwNjIyNjY4ODYsMC44ODcxMzYwMjQ4MjEwMzk4XSxcImluZGV4XCI6N30se1wiaWRcIjpcIjAuOWtldjdlZWZwM1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuMjk4MzE1MjczMDQ4NTgxNjMsMC43NTQ0ODk1NzE2MDg3NjA1XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4xOTgxODc3OTg4MzU2Njg0LDAuNzAxNzQwNzEyMzIyNzM1NV0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4xMjY5ODAwMjExOTcyMzYwNl0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjkxODkyODMyNDM2NDQyMjgsMC42NzExNDE2Mzc4NjczMDI1LDAuNTA3OTQxOTI4OTc5OTM1NCwwLjYxODEwMzY0ODQyNDQyNDQsMC45NDc5Njk1NjYyMjM5NDExLDAuMjY5NzMzNTM5Mzg5NTYzNDYsMC43NzU2NTEzNTg4OTIyOTgsMC44NzU2MTY5MjMzMjkzOTA3LDAuMDU3NzI2MDI2Nzg4MTE1NjcsMC4yNTU0OTUwNzczNjkyODY4LDAuNzM5ODY0MTYzODEwNjIwMywwLjcxMTY4Njc2NDAwMzc0NzRdLFwid2hlZWxfdmVydGV4XCI6WzAuMTMyMTEwODgyMzkyMTMxNTMsMC4wMjcwNDI0NjQ2MDMzNzYwMDQsMC4wMDI3MDQ2MDIyNDg0ODI2NzkzLDAuOTE4ODkwODQxMjA0NzEyOCwwLjEyNzM0OTM3MzMwMzQ2Njk2LDAuNjMxMjQwOTEzOTc4NTc4NiwwLjU0NTgzNjExNDM0ODM3NzIsMC40MjAyNzgwMTIzMDM3NzA4XSxcImluZGV4XCI6OH0se1wiaWRcIjpcIjAuOTRvdjFpdnZkMWdcIixcIndoZWVsX3JhZGl1c1wiOlswLjQyMTc0NTQ4NjU1Njg1NDYsMC4xNDkzMDQ2Mjg2NzczNzc2XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4xNTc4MDAxNDUzOTc4NTc0NywwLjYzNDkzODc5MDkxMDM5MDddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMjYxMTAxNTA4MjAyMjA4MV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjE2MTQwNTYxOTgxMTUwNjgsMC43MDczMzg1MzA4ODMxNDgxLDAuODg2NTc3NTIwNDA1OTkyNSwwLjM4NTkyOTU5NTcyMjY4MTgsMC4wMDYzMjM3NDE0OTA3MjI5MDEsMC41NjAwNzE3MTYwMzM4MjIyLDAuNzE1MDgyODU4NDM0NDQwNCwwLjQ2NDU0NTE1NTM0ODM3NTI2LDAuMDg3ODcxMTY5MDcxNTY3MjIsMC43NDgyNzI2NDI0MzgxMzgzLDAuNjAwNzMzNDA3OTE5MTg2OCwwLjMxMjcxMTg3MTAzMjI4ODddLFwid2hlZWxfdmVydGV4XCI6WzAuMjQzNjIyODM1NzgxMTEzMiwwLjg3NzA5OTAzNjczODg0ODMsMC41NTYzMzI0NTE4NTM4Mzk1LDAuMjE1ODAwNTc4NTY5MTg3LDAuNzk0Nzc0MTkzNjY3OTUzMSwwLjc0NTMxNDcyOTQ3NDI2MDQsMC43MzI2NjU1MDUwMTA0OTUxLDAuODEyNTQzMzc0NzA3MzcwOV0sXCJpbmRleFwiOjl9LHtcImlkXCI6XCIwLmV1djNjaGZjb2dcIixcIndoZWVsX3JhZGl1c1wiOlswLjUwNjE4MDE5MjU5MDkwOCwwLjQwNzQzMDEyNDgwMjMyNzFdLFwid2hlZWxfZGVuc2l0eVwiOlswLjIyODE5Mzg3MDg4NTI2NzU1LDAuMjAzODg0MDc5OTc5NzAwODJdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuOTg2ODA5ODQ5OTgyOTczOF0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjg5MDExMDQ5MTYyMjE3OTQsMC4wMzgyNDYwNTM2MjM4NDI3LDAuMDEyNDc2MjE3NzUxODkwNDUsMC4zMTk4MjM5Mzc1MzkwMDA0LDAuMjQ2MTQyNjE3MDI1ODQxMTcsMC42NjEyMTQyMDU2MTA4OTUsMC4yMDg4Nzg2MTQwNzE3OTM3NiwwLjMwNzI0NDI3MjM1MjM0ODc1LDAuNjkwNjQ3Nzk5MzIxOTQ3MSwwLjEzNDIwMzI4MjYxMDQ1MjQ1LDAuNTU2MjA1NzY2MzkyNTA2NCwwLjU2MzY5MTIzMzYwNjA3MTNdLFwid2hlZWxfdmVydGV4XCI6WzAuMjcyOTI5NDAzMTU4Mjc5ODUsMC44MTE2Njk0ODExMDQ5OTk0LDAuMzQzMDU0MjcwODEyNjc2MjUsMC43Mzc3OTAzNzA5MjYzOTgsMC43MTQ0MDQ5NjMyMDUxOTc2LDAuNDEzNjU1MzQ5MjgyMjk1NCwwLjkwNjU3ODg2NTA2Njk0ODYsMC4yNjczNDM2Njg0MjIwNDY3XSxcImluZGV4XCI6MTB9LHtcImlkXCI6XCIwLjN0NzNyMDg5ODc4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4zMzQzNDc3ODIzNjA4MTg5NywwLjMzMTEwNzUwMDQ0NzI4OTJdLFwid2hlZWxfZGVuc2l0eVwiOlswLjE0ODI2NTEwODg3NzUyMDY1LDAuNzQ4NzQwMDU3NzAxODY5XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjA5Njg2OTY0Nzc4MDU5NTQ4XSxcInZlcnRleF9saXN0XCI6WzAuMTczNDUxODkwOTczMzU4LDAuOTU0OTU3ODUzNTA0NDg2LDAuMTI5NjkwMTIzODg2MzkzNjcsMC44MDkzNDQwMDQ5NTc5NzU5LDAuMjA2NjIxNzAyMjM2MzMyMzYsMC41OTU3NDc1NDk0MzA4MzY5LDAuMTIwOTMwOTM2NDQ2Mjc2NzMsMC4yMzgyNzY3ODUxNTQwNjQxNCwwLjg3ODIzNjk3NzE1NTA1OTEsMC4xODc5Mzk3MjQ0MDkwMjE3NCwwLjUzNDAyNDk4NDQ2MTI3NzQsMC42NzQ2OTM2MjU1ODk2NDIzXSxcIndoZWVsX3ZlcnRleFwiOlswLjc3Mzc0NTI4Mjg1NjU1MjgsMC4yMTc5NzMyNzA0MjIzMTIzLDAuNjQzMzkyNjEyNjkzMzIyNywwLjA1NTk3Mzk5MTI4ODYzMjEyLDAuODM2NDkwOTIwMTAyODA4MSwwLjU1OTQyNjYzNjg1NDA4ODgsMC40ODAyNjg5MjY3MTczNjM2NSwwLjEzMjg2MzM4NTQ0NzQ1OTAxXSxcImluZGV4XCI6MTF9LHtcImlkXCI6XCIwLm90cDRtaGdmZmxnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4zMDk2NzIzODkwODk5MDc2LDAuMzI3MDkwNTg0NTg2MjUzNV0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuOTUxOTc5Nzc3OTQ3MDY1OCwwLjQ4MjQ2NTkxMjc5NDg2OTRdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNTA4ODQ5NTEzOTcxNjM0XSxcInZlcnRleF9saXN0XCI6WzAuMDUzODUwNzY4MDQ4MjEwMzIsMC40NzI0NjE1NzY5NzU0NTcyLDAuNDc1OTE4NzYwNzU3MTk5MywwLjg0MDQzOTIxMDM5MDQ2OTQsMC42MDY4MDM5MTg0MDU2OTg2LDAuMjQ1MDYwMzc5NTc2MjQ1MTYsMC43ODkwNTgzNTkxMDk3MjE4LDAuNDI4MDcyNzM0ODI4NTAxNCwwLjkxNDMwODM5OTgxNDc0MywwLjAxNjY3OTI0NTc4NjM1MDQ5NCwwLjAyMzU5NzM2NTkyMjc5NDE1NiwwLjU0NzIxNTA0NzgyOTY1MjVdLFwid2hlZWxfdmVydGV4XCI6WzAuOTY4MTMyNTQ3MTA4NjkyMywwLjg0NDA1OTI4MDQ4MzI0MzYsMC41NjMzMDQzODg3NTcyOTUzLDAuMzg2NTk5OTcxOTA1NzMxMTQsMC45NDU3MjU2OTc2ODAyMDczLDAuMTU2ODk1OTU3NDY4Mzg0MzYsMC41NDU5OTAzMjgxMDYzNDQzLDAuNjgzNDc2NjYwMTY0MzM0MV0sXCJpbmRleFwiOjEyfSx7XCJpZFwiOlwiMC5tNzJjbThnbGNpXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC40OTIxMTkwMjA1NzAyNTU3LDAuOTczMDEyMzEyMjE4NzQ0OF0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNjEzODczMTEwNzYyMjI3MSwwLjgwMTg4ODI2MDc0MDc3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjI3MzM2MzY2MjIxMjY1NDk2XSxcInZlcnRleF9saXN0XCI6WzAuNDg2NzMzNzkzNzEzNDc3MjUsMC41NjE2NjM5NDIxMTg2ODA5LDAuNjY1MjYyODY3NTQ1MzczMywwLjUyMTEyNzg2OTQ4MzA5NSwwLjg4MjYyMzY2ODAyODM3MTQsMC43NzI0MzcwMTU5NjcxOTYzLDAuNTMyODU0MzY0MzAxNDg3NCwwLjQ4Mjg5OTQ1Mzk1MDMxOTc1LDAuNzAxMTEyODkzOTk4NTg0NSwwLjk0MDc5MTkzNzQ5NTkxMzMsMC41MTk2NzU4MDE2MjY4MTQ0LDAuMjYyMTQ2MDc3MzI2MjI1NjNdLFwid2hlZWxfdmVydGV4XCI6WzAuMDI2OTY4MDM3MTM1MjI4NzczLDAuODA3ODExNTA5MDQ2ODc3OCwwLjExNTY3ODcxNjk0OTk4MDQ0LDAuMjg4NzY1MzE1MjIxMDQ4MSwwLjEwODcxNjM2MTY5NzM1NjU0LDAuMjkwMDU4MzEwMzg0MTU2OTcsMC45NzA1MjA4Mjg1ODU2Mzk1LDAuODUyMTY5OTYzMjc2MjMwNV0sXCJpbmRleFwiOjEzfSx7XCJpZFwiOlwiMC45aGp1cTB2YXJrOFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuNzM3Nzc0MjI3MjQyNDYwNiwwLjI3NzY2NDE5NzExNTM5MDE0XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4xMjA2Nzk4MjI4ODM4MDk3NCwwLjU1MDg0Mjk0Nzc0OTc4MDNdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNDc0Mjc3NzMwNzE5MTI3N10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjQ3NTMyNTczODUwOTYxNSwwLjY1MzQ2MjY5NjI2ODE4NiwwLjIzNjI0NDUyMTg1MDU5OTUyLDAuODYyNDc3MzI5NTMzNjI3OSwwLjM4NDM2NjMwNTM1Njc3MjUsMC4yOTYyNDE2Mzg3NjM2MTY2NCwwLjg1NTU4NjQwMjgwNjAzNjMsMC42MTUzNzk3NzEyNjIxNDA1LDAuMDIyOTA5MzEzMzA4Nzc3NjU3LDAuNzA3ODA3MzgxOTQwNTM3MywwLjI5OTU2MDMyMzMwMjM4NDcsMC45NTkxNTk5ODU1Mzk5MTkxXSxcIndoZWVsX3ZlcnRleFwiOlswLjkxNTkxNDYyNjkxMzI1OSwwLjY5NTY4NDQ2OTIwNzk4NzgsMC4zMzI4NDY5MTk2MzE3NjQwNSwwLjc5MTk5ODUxOTM2MzA4OTIsMC44ODQ2OTk2NDgzODI2MDc3LDAuNzg2MjYwNjQzMzUxNTU2NywwLjY1MjMzMjU3NjM4OTUwOTgsMC44MDE2MTA5NDIwNzY4NDA3XSxcImluZGV4XCI6MTR9LHtcImlkXCI6XCIwLnBrNHVxcm80MXVcIixcIndoZWVsX3JhZGl1c1wiOlswLjg2NTg4ODEwMDc4MDMxNjUsMC4zMzU3MzMxOTg2Mzk4NDczXSxcIndoZWVsX2RlbnNpdHlcIjpbMC41NjkyMDY0NTU3MzA3MzI0LDAuMjc5MTQ1NDg3MTAxMTU2M10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4zMTIwMzc1NDAwMzY3MDg2XSxcInZlcnRleF9saXN0XCI6WzAuOTE4OTU1NDAwOTk5MjUyNCwwLjM1NDI1NzkxMDA0Nzg0NjksMC4xNDk2NDgyNjk2MzQ0NzE2NCwwLjk1NDg5OTIwMzgxMDk0NDcsMC41MTM2OTgxODQ3OTU4MDMxLDAuNTQyNTQyMjIzMzMyNDA3OCwwLjUzODIzMjI2NjczMzk0NDgsMC42ODY3NDA0ODE5MDYxOTcxLDAuMjQwMzA3MTQwOTcwNDE3NiwwLjU5NjAxOTIwMjYxNTE3MjksMC4xOTgxMzkxODU0NjYwNzI4LDAuMDY1MjExOTU1NTIxNTk4Ml0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC45MzgyMTQ3Mjg3Mjg0MjA2LDAuNjM4OTAzMjg5NzYzOTM0NiwwLjU3NDUwNjg2MDY4OTY4NTksMC4zMjk4MDA3OTU2MjAzNzM5LDAuMzc0ODAxMDIyNTI0MzY1NCwwLjE1NTUzMTI3NDU3NTk0MzQsMC4zNDg4ODY1MzY4ODA5ODE1LDAuMjI4ODYwODkwMTU4MDA0N10sXCJpbmRleFwiOjE1fSx7XCJpZFwiOlwiMC45MnBtcWZ0bTA3OFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuMjA5NDAxODYzNTc4MDQzMDIsMC45NjAxODMxODU1Njg0NTAyXSxcIndoZWVsX2RlbnNpdHlcIjpbMC42MDc0ODY1MDYyNTUyNTM1LDAuNDg3MjE0MDg0ODU3NzQ0XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjg4Nzk3Nzk1ODE0MTczNzNdLFwidmVydGV4X2xpc3RcIjpbMC4zNzIyOTM1ODkxMTcwOTU3NiwwLjMyNTA2MzgxNDkzMDI0NjMsMC4wMjM5OTYyNDMzNDE2NzI5NCwwLjUwNzY4NDQ5MjU5MjkzNjksMC45MzYxNzg4NzA2MzYwMDc3LDAuNTU5OTg3NzY3NTE5ODAxMywwLjYxNzg3NjE3MDE5NDUxOTcsMC4xOTE5OTUxNTQxMjQ1OTMyMywwLjQzNjg5Mzk5NDQ5MDk2MiwwLjM0MDk3MzE0MjMzNzc0OTgsMC40OTgyNTU5NTAwNTYwMjc1LDAuMzAxODA1NDc3OTg2MzM0NF0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC40ODA1NTY3OTkyNDE2OTI4LDAuNTI5MTcyOTcxNTA4NDI1LDAuNDU3NjgyNDQ5MDE4NTg2NywwLjI4ODE1ODE2MjU5OTY2ODUzLDAuNDEzMDcwMzgwMjEyNzc1NzYsMC44NDk2MzAzMTAyMTUwMzE1LDAuNDQyNjI0MDk0MTAyODA5MjMsMC4xMTg5OTA4MzUzOTczNjFdLFwiaW5kZXhcIjoxNn0se1wiaWRcIjpcIjAucDBiYjNqY3NhNm9cIixcIndoZWVsX3JhZGl1c1wiOlswLjgwNTM3NzA0MDkzNjM4NzYsMC4wMDQ2MDg1MTE1MDU4NzY0ODldLFwid2hlZWxfZGVuc2l0eVwiOlswLjM3MDMyOTM2NTg1MzE5ODUzLDAuOTExMDcxODI5MDczOTkwM10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC40MTI2ODkzMTM2NjU1NTUxN10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjM3NTA1NTI5NjE2ODg3NDQ1LDAuMzI2OTg5NDU1NTc4ODQ3MywwLjc4MjQyODczMzk2MTc4OTcsMC4wODkxNjc1NTI2MDI3MjYwMiwwLjExODQ2MzY4Nzg5OTU4NzcyLDAuNjE4MjMwNTQwMjA2OTg0OCwwLjY4ODM0Njc0ODAxNTg5MjksMC4zODE3NzkwNTIxNDk5NTY2NywwLjcyMDgxODE2MDk1OTE0MzMsMC43MTgyODExNjcyOTgwNzMxLDAuNTA1MzQwMzk4MjQzMzk2NiwwLjY3ODU0ODU5MDM4ODkzOTJdLFwid2hlZWxfdmVydGV4XCI6WzAuODYwMjUxNjQzNDY2NzEyNywwLjkxODI0MTI4OTU2NDg3MTMsMC40OTQzMzIxNDQ2NDk0MDU4LDAuNDA2NjgxNDQyNDA1MzYzMywwLjk0NTAwMzM5MzQ0MzY5NjUsMC4wNDE0NzY3ODQxNjkwMywwLjkwNzQzMDMxNDEwMjUyODIsMC43OTIwODA1MzE4MTM5Mjk1XSxcImluZGV4XCI6MTd9LHtcImlkXCI6XCIwLmc2bnVlNDBvNnVcIixcIndoZWVsX3JhZGl1c1wiOlswLjI1OTUwMzY1MTc5MDg5Mjg1LDAuNDUxMTcxOTY2OTYzNjE1MTddLFwid2hlZWxfZGVuc2l0eVwiOlswLjg3Mzc3NzMyMDc0OTE2NDYsMC4zODI1MDQ5NDU5MTc1OTg0XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjU3NTA2MzYwNTY0MzI2NDNdLFwidmVydGV4X2xpc3RcIjpbMC4xNjE1NTA3NzI3MjI3NDM2NSwwLjE3NDAxOTE0NzczMTcwMjM1LDAuNDI4NzU4MDc4MTA3NjQ4MSwwLjQyOTMyOTIzODYwMzA1ODI3LDAuNDc2MDgxNDM1MDY3MzEzMjYsMC4wMTYxNDE2NjYxODIxOTgwMzMsMC43NDkwMDY5NTk5MjgzNjk3LDAuODc3OTE1NjYzMzc1NDk3NiwwLjYwODA5Mjg0NzAxODU1NzgsMC40ODQ1NzYzMTU0OTYwNjA1LDAuMTU5ODk2OTQ1MjU4NzYwNDEsMC41NDkyMzMwNjMyOTcxNzM0XSxcIndoZWVsX3ZlcnRleFwiOlswLjQ4ODY2MDQyNjc4NTk5NjIsMC45NTA3MTAwNTUzMzYwMjk5LDAuODk2Mzc4NjAwNDEwNjkwNiwwLjEzOTYyMDA0MjY4ODkwMzgyLDAuMDE3MTA1MzA1NzYxMzM5Mjg0LDAuMTIwMzIwODEzMDMyODU2OCwwLjkwMTY4NTk2NDU0NDAyNTQsMC4zMTI4Mjc5NjU5NTYyNjIwNl0sXCJpbmRleFwiOjE4fSx7XCJpZFwiOlwiMC51aWtwbTlybWJiXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4wODA2NDUxNTA0NzYyMDc4LDAuMDg0MjMxMDE0Njk4NDE1MzJdLFwid2hlZWxfZGVuc2l0eVwiOlswLjM0NDYzOTI4MzUwNDA2MTI2LDAuODY5NDg5NTAzMTQ3ODY3MV0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4xNDAwODQ4MTc5NjQ2MTUyNV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjY4NjAzNTU4Mjc4MjM2NzIsMC45NDc1NjM3ODM0MTgzNzQ2LDAuNTQ4MDQ0NjQ4MTg4MTk0NiwwLjI3MjkwNzI5MTI2NzgzMzQsMC45MTU4MDcxNjI5MDExNTgyLDAuNTQwMzY3NzMxMjkxOTI3NywwLjcxMTA0MzgzNzU4NDgwMzYsMC4zNDY2NjEzNTM1MTQxMDQ1NCwwLjc4MzU4OTI2NDc2MTMxNTQsMC4yNjkxNDAzMjcxNjk5NDA0LDAuMTQ0MzYwNDY0MTE2MjkwMzMsMC4yNzE2ODUxNjc5NDcwODc5N10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC44MTc2NTk0NzU1OTQ2MTg3LDAuNjYzNzM1NTI0MTQ0OTE2OCwwLjg0MDI0NzM5NDQ5NTkzODEsMC42NDM1NTgyMTMxMzAxNzc4LDAuOTE3MDQwODQxMDQyNjIzLDAuOTgyNDM4NzUyNTU4MzIxMSwwLjQ5NzkxNjM5NDQ2NjcwNjQ0LDAuMDA1Mzc3ODMwMTgyMzYxNDg3XSxcImluZGV4XCI6MTl9LHtcImlkXCI6XCIwLnBoa29kNGg2NjZvXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4zODg1MTIxNTQ3MDUyMTE1LDAuOTQwODE0Nzc5Njg2NzE3NV0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNjA2Njc2MDQ5OTkyMDM4NywwLjc0Mzc4NTM3MzUxNDE0NzhdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMDQ3NjE5MzQ4NDYzNzQ0ODI2XSxcInZlcnRleF9saXN0XCI6WzAuMjgxODAxODE4ODk5NDY3MSwwLjUzNzY3MTEyODMyMzU1MTEsMC4yNzgyNjUyNDkzNDcwNTcsMC4zNzE4MDM4MDc0OTQwNDA2MywwLjAwMTYzNTQxMTI0NDA3NzA2NzQsMC4zNzM0OTIwMjk4NDA2NTM5LDAuOTI1ODI0MzY0OTQzMzU0NiwwLjk2MTEyODIwMTA2NDgwOTksMC4yNjM1Njc3NzU4NDQzMzAyLDAuMjk5NTEyMjY2OTY5ODc2OSwwLjQ1MDA5NTM3NjIxNjYzMTc2LDAuMTQxMjA0OTUwMTg5NjE5NTRdLFwid2hlZWxfdmVydGV4XCI6WzAuODIxMTUyNzAyNTMwMDI0MywwLjYzNzg1MjA2NDYxNTAwODUsMC44NDMzNjkxMjQyNDUwODg3LDAuMTAwODAxMTI1MzA1MTQ5MDYsMC43NDIwNTcxNzE4NjQzMjk0LDAuMDYyNDA2NTk0NDk1Mzc1NzgsMC41MDE5OTYzNzk4MjI5MTkyLDAuMTM5NTg4MDMzMjcwMzMyNzZdLFwiaW5kZXhcIjoyMH0se1wiaWRcIjpcIjAuY2RzYjJ0MGEwZ2dcIixcIndoZWVsX3JhZGl1c1wiOlswLjI0NTA1ODQyMTc2NjAxOTY2LDAuNDc5Mzc1NzA2NjE1ODgwMzZdLFwid2hlZWxfZGVuc2l0eVwiOlswLjczMTg5NjMzNTkxOTg4ODIsMC4yMDQzMzU5MTkwNjcxNDI1NV0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC45NDQwODA0MDEzODA4MDE3XSxcInZlcnRleF9saXN0XCI6WzAuMjc2NzE3NzE4NTczNTU3MiwwLjQwMTkxMjA2OTE5NzM5MjUzLDAuNjk5MjUyMDYzMTc1MzY0OSwwLjU4MDUzNjcwNTQ3NjU2NzMsMC41MzI4NzYwNjk0NTk1ODkzLDAuNjA1MTY1NTI2NjM5Njg1NiwwLjg2NTkzNzQ5MjM2OTgyMzMsMC42Mzg1NzQwNTE4MTY0NTkxLDAuMDkxMzYxNzU2NzI0OTUyOTUsMC4xOTQ2MjY3MTYyNjA3OTMzLDAuNTg0ODMyNDc4MzQxOTQ3MiwwLjk2MTIxMTUwNjk4ODk4MTddLFwid2hlZWxfdmVydGV4XCI6WzAuOTg0MDQxOTcwODY3NDQwNCwwLjQwMDIwNzgzMjg4Nzc1MzQsMC42MTE0NjY4NDkzMDA0OTY5LDAuMDU0NzY2MjgyNjk2Mzg3NSwwLjc1OTAyNjMyMzYxODY4OTYsMC45MDk1ODIxNzE4NDQzNjUxLDAuODI1Mjc4NTAwMTQ0NTE5MywwLjkzNTQ1NzM1MDMxNDQ3NzldLFwiaW5kZXhcIjoyMX0se1wiaWRcIjpcIjAuNWVjM2Y3dWM4NmdcIixcIndoZWVsX3JhZGl1c1wiOlswLjc0Mjg3OTQ1MjY3Mzc3MzksMC4xNDcyNzA3OTA1NTM1MzU1NF0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMjE3MjAxMzQzMjQ2NTc1NTgsMC41NzU0MjY4Nzk0MTQ2ODM3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjIyNDc2NDIxNDI0ODk3MDA4XSxcInZlcnRleF9saXN0XCI6WzAuODIxMjk2MzcyODE2MDEwNSwwLjIyOTczMzE4OTIyMDc0ODYsMC4yMTA1ODgxNzk3NzY0NTUyOCwwLjMwMDI4NjMzNDkxOTE0NDksMC4xNjA5NTQyNDExMzk1MzA4MywwLjI4NTcwOTc5MDM1MDAxODc2LDAuODUwNTA1MzIyNTk1OTIwNSwwLjAxMjA5OTc3NTU2NTI0NTY2MywwLjQzMDcxOTA5NzAyOTYxNDY0LDAuMzU4MTgyMDY3MzM5MDMzNywwLjk5NDEzOTY2NjMzNTA5NTIsMC4xNzExNTIwNDY2MzE2NDc2M10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC42MzQ5MzY1MDQzNjQ3MzkzLDAuODU2NDE2ODA1NjU1OTIyNywwLjgzNDczMTQxMDM5ODMxOTcsMC4wMTM1NjE2MDA5ODkxMTU1MTksMC4yMDQ3MzgxMzU1NTg5OTA3OSwwLjk3Mzc4ODk0OTUzMTUyOCwwLjMyOTg5NTU0NzU3MjAxOTEsMC43MDQwNDk4NzAyNjgyNDNdLFwiaW5kZXhcIjoyMn0se1wiaWRcIjpcIjAubzJtN2Uzamw1bVwiLFwid2hlZWxfcmFkaXVzXCI6WzAuODY2MTM2OTQ0NzQyMzA5MSwwLjM2MjA5MTg2NjM2ODU1MTczXSxcIndoZWVsX2RlbnNpdHlcIjpbMC4yNDg4NjM2OTk0ODI5NjI3MiwwLjk0ODExMzY3MDg5NjE2OTddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNDY0NTM0OTA3MTQyODU5N10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjM5NjMxNTgxNzE3NDAyMzMsMC4zMjU2Mjc4ODIyNDUyOTE2LDAuNDM1ODg2NTYyMTY5MzA4MiwwLjQxODAwNjU3NTY3MjAxMjQsMC4wMzM1MDc1Nzc5MDEyNjYxMywwLjI2ODEwNjc0OTU5NjI3MTksMC4xOTE0NTc5OTUyNjI2NzMzNywwLjczNzExMTE4ODQ5MTE1NjUsMC40NTAwNDA4OTU1MTk1ODg1LDAuMTA2ODgyNjE1Njc2NzkzNDcsMC4zODIxNTQxMzExNDY0OTIyLDAuMDA5NDE2NzUwNTQxMTcyMTkyXSxcIndoZWVsX3ZlcnRleFwiOlswLjk1NzU0NjI3MTI4Njc1NTEsMC41Njk1NTAwNzYyMzU1ODAzLDAuNzk4MTQ0MzAwMjE1NDYwNSwwLjk0NzQzMjg0MDM3NDk4MjMsMC43MDI3MDE2MDk2NDAwNzExLDAuODI4NjQyNDY2MzcxMzY5NiwwLjgzMTA1MDAwMDk0NjE3NzIsMC4yMDM4OTQ1MTc5ODMyMzU0M10sXCJpbmRleFwiOjIzfSx7XCJpZFwiOlwiMC52aWo3aDRsbDNpZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuMTgxNDk4MDA3NjE1NTQ4OCwwLjI2Mzg5NzYyMDUwNzIyNTY1XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4yODI5MzUyOTcyNzAzNTE4LDAuNzQyNjQ2ODk3ODE3NjUwNl0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4wMTQ0ODY2NjI2MTM4MjMzNjVdLFwidmVydGV4X2xpc3RcIjpbMC4wNTMwODY3Nzc1ODYwNjIxNywwLjM2NjAzMjk5MjAwMDAxMDUsMC45MTU0NTg4MTExMTA5NzU2LDAuNjU5OTM2NzQwMzE0MjQ3MSwwLjAwNjIzNjcwMTAwMDM3MjEwMiwwLjk0MTY3Nzk3NTc3MzQ3MTcsMC44MDgwODA5Mjc4MzM5NjE4LDAuNDI0OTk3MTU4NTcyOTE4MiwwLjQzOTQyMDIzNjIzMjcwNzc2LDAuNDQ2MzIxNzgyMDQ0MzM0OCwwLjc0MDc1NzAyMDYzODk1OCwwLjA5MTU0Mjg2MzYyODU0MjQ3XSxcIndoZWVsX3ZlcnRleFwiOlswLjE3MDE0Nzg4ODcxMTM5OTQsMC4yMzk1MTUwMDAyNjY1MTY5NSwwLjg0MTcxNjA3NTMwNTAwODEsMC40NDY2ODYzMjE5NzMxMzc4NSwwLjc5ODQ3NDY2MjAxMTA5MDMsMC4yNDk5MzA1MDUwOTcyOTY0MiwwLjU5ODI2MTM0MTM3MTgwMzYsMC4wMjQ2MzQxNDMzODAzNzU2MTddLFwiaW5kZXhcIjoyNH0se1wiaWRcIjpcIjAudmJ1ZHBxN3I4amdcIixcIndoZWVsX3JhZGl1c1wiOlswLjE4ODA4MzM3OTIwODY1MzgsMC4yOTA5NDE3NTU2MjUzNzI0XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4zODM1MzUzNjA3NDg3NjM3LDAuMTI1NDI0NzExMjc4MDYxOThdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuOTkxNDg4NzI2Njc4NzgzNV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjE0MDgyMDIzMjc5NTE5NTMsMC45MDA2NTYzNzQ5MTcyNDU0LDAuMjg2MDEzMTg5NjU0Njc0NywwLjUwMzYwNTgyNjgwMTUwOTYsMC4yODIzNzE3NTM1MTQ2NDU5NCwwLjY5MjA5MzUwOTc3MTc1NDksMC40MDMwMDIxNDMwMjA1ODU5LDAuNDUyNjM0OTYyNTMzNDkzOCwwLjMyOTUxMDY2MTM4Njc1MDY3LDAuOTkxNTYzOTMwMzI0ODkyNCwwLjE1NDIxNDkxNzgwMTgwNTA3LDAuNTY1ODEyMDM3NjQ0NTAyOF0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC42MjA3Nzk2MDgxMjUxNDk4LDAuMDg0NTc1MjkzMjE4Nzk5OTcsMC4zMDk1OTYwODkzNDUwNDU1NywwLjkyODk4ODc5MDE1MDYwNzUsMC4yMTEzNDQyMDA5MDAwMTAzOCwwLjI2NjE1ODQ3NDA0NzgxMDQ2LDAuOTY3OTk4NjMyNTk5MjU3NiwwLjAzNjM5MzI2NjYwOTA1NjI4NV0sXCJpbmRleFwiOjI1fSx7XCJpZFwiOlwiMC40aWdrczc3ZGZsZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuNjE2MjYzMDY4ODgwNTEwOSwwLjk5NjMyMjE5NTcyNDExNl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMDcyMTkzODk1NTgzOTUwMjgsMC44MTYzMDkwMDQxNTc5NDIyXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjY0NjM4NzE3MjQ5MjQ3NjhdLFwidmVydGV4X2xpc3RcIjpbMC4xNDY4NjI4MjkzOTU5MjczMiwwLjM1Mzg2MjQzMzgwODkwMzgsMC43MzUyNzg5MTA3MTcyNTA4LDAuODMzNjIxOTEzMTMzNDkwMSwwLjEzNDU4NDQyMTQ5NDc5MTEsMC4wNjk1NzExNjY2MjM1MzI4LDAuMDU4OTE1NzQ5NjExNDIwNTQsMC41OTE1MDgyMTEzMjY5NTY3LDAuODEwNjA5OTA4MTc1NjY5NSwwLjA5NTg3NjMxNzQyNTg3ODk5LDAuOTc3NTc4OTE2MjEzMDU1NywwLjYyMDAxMTAwMDI1MTEzN10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4yMzg2OTE2NDMxNzI5OTA2MywwLjQ2OTYwODIwNTM0MzQyNzg0LDAuOTgwOTIwOTQzMzk4MDI2OCwwLjA5NDA4NzE3NTE3NTk4OTUyLDAuOTU5NjIyODQ1ODYxNTQ5NCwwLjE0OTMxMDY2NTAzODUwMTIsMC41NDI0MTE2OTQ5ODgzNDE1LDAuMzUwNjg3NjIwMzkxNDkyMzddLFwiaW5kZXhcIjoyNn0se1wiaWRcIjpcIjAuaTdpbjcxMGYzOThcIixcIndoZWVsX3JhZGl1c1wiOlswLjAxMDc0MjQzNTM1NzA2OTk4LDAuMzc0OTYxNTAyNDQzOTU0NzZdLFwid2hlZWxfZGVuc2l0eVwiOlswLjIxNzYxMTYzMDMzOTg3NTg1LDAuMjg3NzA2OTA0MTcyNjY5ODZdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNzc4ODUwNDc3NDcwODcwN10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjkwNjUwNDUyOTQ1MjcwNjEsMC4wODMyMDMwODM0OTg3NTczOCwwLjAzNDYwODY0NzI4Mjc4MDY4LDAuMTI4ODU0NTk0OTgyMDM3NDQsMC43MDM2MTIwMTEzNTg5Mjk3LDAuODMwMTE1ODE1MTg1ODcxMiwwLjM5NTc3NjkxNTg0NDI3MDEsMC45ODk3NjE0MzQ1MTgxMzkxLDAuMDgwODgxNTM3MDU2MTk1NSwwLjk0MzU0NjA2NjczNTE2ODUsMC4zMDcwMjY2MTM0OTAxNDI3LDAuMDU1MjMzNDcxMDI2MjQzODc0XSxcIndoZWVsX3ZlcnRleFwiOlswLjIyNzA2MjQwNzg2MjkwMTMzLDAuNDUzNjM4ODI4NTgxMzQ2NjMsMC40MDQzMTEwNTQzMzg4MDcxLDAuMDQ2NjIxMzMyNjc4NTczNiwwLjE3Mzc2MTMwNTQ4Nzc3MzEzLDAuNjQxOTQxNjA1NTQyMjE5NiwwLjQ1MDM0MTgyMDUzNjM4ODk0LDAuMDYzMDM0ODY0OTU0NjIzNTJdLFwiaW5kZXhcIjoyN30se1wiaWRcIjpcIjAuOTZpdnFwcGVnYWdcIixcIndoZWVsX3JhZGl1c1wiOlswLjQ5MTExNzkyMzA5MDIwMDUsMC4zNTA0NjQ0NDY5MTkzOTA5NF0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMzM1MzQ0NDk2NzI4OTcwMjYsMC45MzM1MTc2NTgwMDMyNDI3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjMxOTU3NTM4NjY0MTEwNTc0XSxcInZlcnRleF9saXN0XCI6WzAuNTkyNjI1NDg3Mzg1OTM1MSwwLjcxOTIwODc5OTUyMjk4NDYsMC40ODQ0OTE2MzA0NjkzODgyNiwwLjc4MjA3NTc2MTYyMDg1ODIsMC43NDYyMDU0Mzk4MjQ1Nzc0LDAuMDkwNDI2MjQ2NTMyMDMwNDYsMC4xMDcwMjU4MTUwMzU0Nzk5MiwwLjkwNjE4Nzg3NzM2MjY5NjMsMC42NTIyMjk0MTIyODQ1Mjk0LDAuNjc3MjcxMTM1MTkyMzQ5NywwLjAyNDUxMTY5MzU1MjI0MzgwNywwLjgwNTQ1OTMxNDMwNTgzNTVdLFwid2hlZWxfdmVydGV4XCI6WzAuMzYwMjk4MTA0MzgzMzMwNjUsMC42MDY1MjM3NjA2MjM3MTQ0LDAuMzI2MDIxMzIxNzEyNDI2MzcsMC41OTQwNDE1NzE5MDc2NDA2LDAuNTgyMTA1ODY5NDgwNDQ0MiwwLjY0NzQ2OTA4MDA2NTAxMDcsMC41OTA2NTYyMjU0ODE3NzAyLDAuNDc3NTQ4NDM5OTMyNjU1OTRdLFwiaW5kZXhcIjoyOH0se1wiaWRcIjpcIjAuZmZxOGRlcGNocGdcIixcIndoZWVsX3JhZGl1c1wiOlswLjE5NDI0MTE0NDAzNzg0NTU0LDAuNDExMTYxNTAyNTQ2Njc1N10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNzE2MTExOTUyNjk2OTAzNSwwLjkyMTA5MTQyMTg5NzkzNjddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNjcyNjA2NjQyNTg3NzU5N10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjYwODcyNTE0OTE3OTA2MzEsMC43MTI2OTIyNTYzNjA4Mjk4LDAuMjg0ODEzMzIxODI0NTAyOCwwLjI1Nzc3Nzg5MzA1NjAyNjQsMC45MzIyOTE3NTA1NjA4NjksMC4yNjAyNDYzNDM4NjE4MDQ1NiwwLjkwMDg2MDgzNjk3NTE3NDksMC44MTk2ODYxNzkzNDAyNjg4LDAuMDQ5NzgxMTI4MjUwNDQ2MTE2LDAuNDk4NDY4OTY0OTkxNzYwNjMsMC40MjIwNjc3NjI2Nzk4OTg3NiwwLjEzMjgyNjQ3Mzg5OTE4Ml0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC41NTI3MDcxMjcxNjQ3NDMyLDAuNjAwNjY2MzA5MzkxOTE0NywwLjg4ODg3MDc2NDc4NDM3MTQsMC4yNDQ3MjcxMzA0MTYzMDIxMiwwLjkyNjQ0NDkzNjc3ODY0OTQsMC4wMDg2NzM5ODMyMjAzNDI4NTEsMC42NTYxMjY4NjM5MzA1OTM3LDAuODAwODY5ODQwNjAxOTE1XSxcImluZGV4XCI6Mjl9LHtcImlkXCI6XCIwLjMxazFic2EyOXY4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC41MjE2NTc5NzIzMjI2ODg0LDAuNjkzODAzODc4MjUyMDU3Ml0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNzUxMDUwNDkzMDg0NjM3OCwwLjkzNjAyMTE2NzE2NDEzMzldLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuOTkxOTY5MjU0NzgzMzU4NV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjYyMDIyNTM0NTA2NjI3OTgsMC44NDA4OTMyOTAyMjg4MDI5LDAuMTQ2NzA3OTk1NTYwODk0MywwLjk4NTA0NTAzMDEyNDE3MjQsMC4yMzM0NDQ5NzYxOTEyMjAzLDAuMjg5NzkxMjMyNzMyNTQ2MDMsMC4yNzA5MzgwODAxNzU2Nzg2NiwwLjE5MDcwNDYyMzc0NzgzODkyLDAuMDUzMzYwNTk3ODI5NDI4MjYsMC44Mjc2MDcyOTI2NjMxODMsMC45MzE5MTIzNDIxOTI1NDksMC40Mzc2NzE3NjI4NTk1NzY3Nl0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4wNDE1ODY2OTQ3Mjg2NzA3MTQsMC4wNzI5ODI3MTc1MTkwODA3LDAuMDE2OTE2MTU0OTA1MjkwNzQ4LDAuNDkwMTQ1NDU5ODgyMzIwNSwwLjIzMTE5ODkzNjc5NjY1ODI2LDAuMDI1MTMwMDY4MjMyMTQ5MzYsMC40ODkzODkwOTg2MzkyNTk5NSwwLjM4ODQzNTAxNzA1Mzc3NDVdLFwiaW5kZXhcIjozMH0se1wiaWRcIjpcIjAuOTBra3ZiNHVjaG9cIixcIndoZWVsX3JhZGl1c1wiOlswLjkxMDEwMzc5OTI3ODU0NzIsMC40ODc4NTkyNDcwMTE1OTEyXSxcIndoZWVsX2RlbnNpdHlcIjpbMC4zODQ4NDc3OTcwODI0NjMxLDAuNDUzODkwNDk2OTc5NjEyMDNdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMjYwODAwNzk4OTM2OTMxNjRdLFwidmVydGV4X2xpc3RcIjpbMC41MzE3OTMyMDc1OTM1MjE0LDAuNjg3ODE4OTMxMDIxNDE5MSwwLjk4MDMxMDE0OTM3MTExNzcsMC43NjU3NTE2NTUwNTM0MzQsMC40MDYwMTg3MTgzMjE2OTg4LDAuMTE4NDg3Mjk0ODkwNzI4NTEsMC41NzM1MjQyMjU5MDc4NTIzLDAuOTg4ODM3MzE0MDE3MTM0MywwLjY2MzE0MjE3NDc4MjA5MTEsMC41NDMwMzI5ODYzNjIwMjE2LDAuNDU5ODI5OTk0MzU4MzY2MTMsMC44OTY5Njc2NTE3MDM2MDIzXSxcIndoZWVsX3ZlcnRleFwiOlswLjQwNTQ1NzI2MjA4Nzg0OTYsMC4zODE3MDU2NTgzMzUxNjEsMC42MjM0OTUxNDYyMzgxNjU3LDAuNjQzMzI4ODU1OTczNDUzOCwwLjg1NzIyODI2NjQ5NzkzMiwwLjg5OTU1NDk3NDExOTkzNjcsMC4wNzY1MTEzMjc5MzIzMTg4NSwwLjc3MTE3NjUyODY5ODUzNjhdLFwiaW5kZXhcIjozMX0se1wiaWRcIjpcIjAuYWpndGNpM3NjZzhcIixcIndoZWVsX3JhZGl1c1wiOlswLjMzNTE5NDgxNDA2MTcxODksMC42Mjk5NzMxODc5MDg3NTM4XSxcIndoZWVsX2RlbnNpdHlcIjpbMC40MTUzNDE4NjgxMDI4ODU1NCwwLjI3MDQ0MTM1MjcyMjMwNDJdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNzAxMzcyMzUyNjI3MTUwOV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjc0MTU3ODI1OTI2NjkxMzgsMC42MzUyNjQ0NDMyOTE4MjkzLDAuMTczNjY2MDI1OTYyMTA5NjcsMC41MDcyMDY3OTM0Mjc0OTczLDAuNTkxNTU2MDQzMjAxMzg3NSwwLjQ1NDkzMDExMzI1MTY4NDUzLDAuMjY0OTQwOTIzMDUyNDQ5MywwLjc1NjIxMTAzNTY1MjQ5MjMsMC4wNzg1MzI5MjE2NjgxMzc0MSwwLjYxNTQzNTg3NjA3NjI3MjEsMC44MTg4MDMwOTg5ODUxODA0LDAuODc0ODMxMDM4OTE1MzQ1N10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4xMDg2MjM0OTczMTgwNjMwOSwwLjU4NTc2MjM2Njg0Nzc4NDUsMC40NzM0MDc4NjA3OTc1NzkzNSwwLjI2NjY2MTYwMTU2MTQxNDA1LDAuNzExNzAyNTkzMjgwNjUyMiwwLjUzMzQzOTI4NTEyOTQ5OTgsMC45NzQwMjA0NzEwMzQ2ODc2LDAuODExOTQ4OTQxMTQ4NDkyMV0sXCJpbmRleFwiOjMyfSx7XCJpZFwiOlwiMC5pajZubGxjYzZqOFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuMDY1NzY1MzYwNzE4ODM3NzYsMC4yNjk4MTM0NjA2MTY4NjU2XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4xMDgyNjk4ODk2NDE0Mjc4MSwwLjQyODA3OTM4NDA2Mzk3NzZdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMTI0NTE3NTM1NTU4ODkwNTZdLFwidmVydGV4X2xpc3RcIjpbMC45ODU5Mjc2NzU2NTkxOTgxLDAuMzIzNjE1NjE3ODMxODI1NywwLjIzODgxNzEwOTg5MDYwNzEyLDAuOTA4NTA0NDgzODMxMjk4NiwwLjA3NTkwOTE4NTE5MTQzMjg2LDAuMTE3ODMwMjY3NjE1MDE0OTIsMC43NTQ1NDk0NzQzMTgwMTA4LDAuOTgzMDkyNjIyMjYxMTgzMywwLjIwNTUxOTA3NDMxMjg3ODMsMC43MDg0MjczNTUzODkxNDA1LDAuNjE4MDc5ODEyNDc3NzIyNSwwLjAzODM3NjU4Mzc4ODA4NDk1XSxcIndoZWVsX3ZlcnRleFwiOlswLjI2MjU3OTU4MzI5MzY3ODE0LDAuMzc0MjI3NTYzNDM1NDQ4ODMsMC45NzA2NjM3MDk3NzIzODM4LDAuODI3MDQwMjg3MjkxNjk3NSwwLjY0MjM0NzA2MDI4NjE1MjcsMC4zMDQ5NDY5NjAzOTM2ODQxLDAuMDIwMzE1NDI0NDIxMDI1MDc1LDAuNjczMTU0MjMxNTY5MjE5Nl0sXCJpbmRleFwiOjMzfSx7XCJpZFwiOlwiMC5jZmFtamtnZTE0XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC41NTUzMzcxMjIzNDQxMzI2LDAuNDgyNTU5NTI1NDUzMDExOTVdLFwid2hlZWxfZGVuc2l0eVwiOlswLjEwMjMzNTY3OTU1OTU3MTEyLDAuNDExODY2Mzk5NDYwNjQ2Ml0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC44NTA3MDEwMzcyNDk4MjAzXSxcInZlcnRleF9saXN0XCI6WzAuNDQzNTUyNjE0NDQxMDgxNSwwLjc5NTI1NzExNjEyMTYwMTUsMC42OTU2Njc0Mjk4NDgxNjk4LDAuNzcwMDM4MTE1MDQyNjI2OCwwLjAyNDQzNzc5MTkyMjY1NzI3LDAuMzMxNDkyNDIwMjI2NDUyNCwwLjUzNDg0NzI4NzIxNzY4OTMsMC4xNjk5ODk4MzU4NzExNzQ0NCwwLjM3MDI1Njc1MzE2MzYzNTgsMC4xMzI0ODg3MTEwODM1OTM5NSwwLjMyNDIxMTUyOTA4MDgwMjUzLDAuMTIzODQzODk5MzU0Mjk1ODVdLFwid2hlZWxfdmVydGV4XCI6WzAuNTU2MjM2MTc3NzQxMzExOCwwLjAyMDE4MTk3MzI3MzAwMDQyLDAuNjY1Njc3Mzk2Njk4Njg4MiwwLjM0MDU2NzA3NTQ5MTY3ODk3LDAuMzIyODY4NzI0ODI4MzAzMSwwLjAwNTQ2ODk2MzI4MDc5MjI3MiwwLjI0ODc0MTMyMzEyMzEzMTY5LDAuMDA3NTY4MDI5NDE3MzI5MjU4XSxcImluZGV4XCI6MzR9LHtcImlkXCI6XCIwLjg5N3VwdXNwMDBvXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC45NTA2MjIxMDU3NzM5Mjg4LDAuMjYzNDY3ODI4ODc4NzI2XSxcIndoZWVsX2RlbnNpdHlcIjpbMC43ODEwMTY2NDUzNDY0MzczLDAuMzg2NDc5OTI5OTg4OTgyMDZdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMDczNTQyMTgyNTc4MTI1NV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjMzMzczMTE0MTE1ODcxMTE2LDAuMDk4Njk4NjExMjE3MjgyOTYsMC4xNTU1ODU1MTQ2NTE5MDI1LDAuMzE3NDg3MzE4NzIxNzg1NSwwLjQ3NTI4MjY3NzA3NzMzMjYsMC4zMjk5MTU5ODkyNzk3NjU0LDAuMTk2MDAwOTc5Njc1MjQ1NTUsMC4xNDkyNTE3MDk2NDE5NTYzMywwLjAwNjg2NDUyNDA1MjcxMjk4NCwwLjc1MzI0ODkwMTc1NTQwMjMsMC40MzgzNTQxNzIwNTI2NzYsMC4zMTEyNDAxMjQ3NzY4NTIxNV0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC44NDk4NjczMzI4OTUyNTc1LDAuNDg4MzMyNTAxMzk2MzMzNTUsMC43MTQ4MDE2NDc1NTQyNzYsMC44OTg3MTA0MTM2Mjg1MTk2LDAuOTM4NDEwODQ5NDc5MjY0NywwLjg4Mzk4NTM4NzY0OTE2MzksMC40MTk0MDExMDU3NTYyMTI2LDAuNTAyMjQ3Njk0OTAzNjQ1Ml0sXCJpbmRleFwiOjM1fSx7XCJpZFwiOlwiMC5ldWd1ZTlwYzdxb1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuMTQ1ODA4NzkzODI4MTQ0OTMsMC44NzQ0MDA5Mzc1ODEzNDJdLFwid2hlZWxfZGVuc2l0eVwiOlswLjM1MDU3ODI2Mzc2NDc0MzQ0LDAuNDkwODU3MTI3NTczNzE5NDddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuOTI2MTQ0OTgxNzg1MDUyN10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjE2NjkwMjc5NzgxNTcxNTYsMC4yNjg4NTMwNTYxMzQ4Mjc5LDAuNDEwMjM3OTI5MDIwNDc5MiwwLjU4MTQyNTk1NTY0MDU1NjgsMC40NDk1NzgxMjMwOTA5NjYzNCwwLjc1MDcwODM1NzI0MTY3NDQsMC4wNzI4Nzc3MzMyOTcwMTU4NiwwLjc5NzQzNjc3MzY2MjU3MjUsMC4wNjg0NjE4MDc4MzA3NzUyNywwLjczNDQ3NTQyOTExOTE1NDksMC41NzAzMDI2NzU5MzI5Njc3LDAuNjI4OTMzNTU3NDk1NTY3XSxcIndoZWVsX3ZlcnRleFwiOlswLjc5MTcxOTIzMjgwODYyMjksMC41NzA4MDE5MDIzNjU5NjIzLDAuNzc2NTI1MDIwOTE1NzkzMiwwLjI5MjY0MjM0NjYwMTQ3MjI2LDAuMjc5Mzg5MjMzNzg5NzUzNDQsMC4xNDM0ODEwNjEzNTEwNjA0MiwwLjU2MDkxNjc1NTUwODc4NTUsMC41MDQ3NDQyOTM4MTkyMzM5XSxcImluZGV4XCI6MzZ9LHtcImlkXCI6XCIwLmw2c2NsNW50amRcIixcIndoZWVsX3JhZGl1c1wiOlswLjI0NTU3ODEyMTQ4NzUyNTY3LDAuNjc0MDQ5NjA0MzcwNjg4MV0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMDc4MDA0Nzg3OTA2MDM2ODIsMC41MjI0Mjk1NjczMzg1NDU3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjA0NjA4ODUxMTcwMzIwNTQ5XSxcInZlcnRleF9saXN0XCI6WzAuMzA3NTM1MzI1ODA2NzMwNiwwLjk0NjQ5NzQxOTk2NzgwMiwwLjQwNjI5MjIzMDI5NDM4NTY2LDAuMjc2Mzc0MTA3ODk4MjM4NywwLjI1NjQwNDc0MTMyNDU0MjcsMC45MzExNTM4OTkzMjQwMzg5LDAuNjQ1MzI1NDE2MzQwNTMyMiwwLjYxMTQ3OTY4Mjg5NjQ1NDQsMC41Mzc4MjgyODgzOTEwMjQ0LDAuMTk5MjE2MDk4NDY2NDQ1MjgsMC45NjUzNzg1MzQ1MjUwMTk0LDAuMzk3ODkwOTY4NDk5MTQ2MDddLFwid2hlZWxfdmVydGV4XCI6WzAuMTc1MjYwNjM3MTExOTY0MDUsMC41MjE5MjI3MzY0Nzg1NzE1LDAuMTkyMjg0MDA4MjgyODU2NTIsMC40NzQ3MTE5ODEyMDgyODM0LDAuMTI5Mzk5NTE5NzYzNzY0MDcsMC45NzE5MTU3NDU5MzM2NDIzLDAuMDU4NTUwNTc1NTAwMzM5NzEsMC4xNzAxMTYwNjgwMDM1OTA0N10sXCJpbmRleFwiOjM3fSx7XCJpZFwiOlwiMC5za3I2bW1pMHN1Z1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuMTMwMTk5MDM1OTUzMTUxNzQsMC42OTc4ODQ3NDEyMTUzMDg5XSxcIndoZWVsX2RlbnNpdHlcIjpbMC45MzgwMzgzOTI5MTY4Mzc5LDAuOTAwNjI2MzE1Mjc5NzU5Nl0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC41MzYyMTUzNTcyMjE1NDk2XSxcInZlcnRleF9saXN0XCI6WzAuNzg5ODUzMzIwMzQ1MjAzMiwwLjA0ODI2OTk2MDk1OTUyMTg1LDAuMTA0NjE2OTA4MDc0MzYyODYsMC4xOTE0MzUwODYwMDg0OTE0NiwwLjgxODc1NjE4NDY4OTI1NDQsMC4yNTM1NzY1MDE2NTY4NDgzLDAuNDY0NDI3MTA5MzEwMzE1NCwwLjc3NDczMjE2NjM1NjU2MDUsMC43MTU1ODg4NTY0MDk5NTY2LDAuMjI3NzM2ODQ5ODUwMjA3NDgsMC44NzY0MDQyNDA4MDY5NzEyLDAuMjU2NTAwMTk4MjIzNDkzNTddLFwid2hlZWxfdmVydGV4XCI6WzAuOTc0MjI0NTQ5NjUwNzI4NSwwLjM4NjQ5NTE1MzQ2Mjg2NTU2LDAuMzMwNzA0ODMxMDI3MDk3LDAuODY5NTExNzMwNzIxNzM3NSwwLjgzMjQyMTM1NTYwOTkwNzQsMC4xODE1NzM0MTcwMDQ2MDA0LDAuNDA2ODUyOTM3MTQ3Nzc3MTUsMC4zNjc3NDA4NTgxMzE5MzYzNV0sXCJpbmRleFwiOjM4fSx7XCJpZFwiOlwiMC4wYm9kOHVsdmU1OFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuNTY5MDgzODIwMjM1NDE1NiwwLjI0OTQ3MzE3NzA3MjMzNjYzXSxcIndoZWVsX2RlbnNpdHlcIjpbMC41MzI3MTcyNDQyNDE2MDk1LDAuNTIyMTgzMTQ5NjE3ODc1N10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC44NTg2MzgzMDM5Mjc0MzNdLFwidmVydGV4X2xpc3RcIjpbMC42NTQ0MTY1ODQ5ODU2NzA3LDAuNzkyMTY3MDY1NjEyMDY5NCwwLjIyODI4MTAxNTkxODg2NTUyLDAuNjYwODkxMDUzNjU1ODg2NywwLjAyNTI2MDM1NjQyODkzMTA5NywwLjcwNDQ2MTQyMDkyNzE5MjQsMC45NzYxOTA3MjI4OTYyMTk0LDAuNDcxMTY0OTIwOTE0Njg5MywwLjU3MjcwNTAyNzU0NzM1ODQsMC44MjcyNzU2NjM1MjA0MjQxLDAuMzk4MjU1NzIxNTM0NTI4NCwwLjU0NjcwODgzMzQxNTYxNF0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4yMDI1NTk0NjQxNjY4MTYwMywwLjI4MjQ1Nzk5MjA3ODIyOTEsMC4zMDE4NTE4OTUwNDA2MzcyNSwwLjczNzMwOTE5MjEyNDM0MjIsMC44MzUzMTEzNjM5MTY5NTQ1LDAuODc4NzMwODA2MjcwNzQzNywwLjIwMjIzMDA0NDg0OTMwMjg1LDAuNzgxMjc2NjQ0Mzc4ODk1OV0sXCJpbmRleFwiOjM5fV19IiwidmFyIGNyZWF0ZSA9IHJlcXVpcmUoXCIuLi9jcmVhdGUtaW5zdGFuY2VcIik7XHJcbnZhciBzZWxlY3Rpb24gPSByZXF1aXJlKFwiLi9zZWxlY3Rpb24uanMvXCIpO1xyXG52YXIgbXV0YXRpb24gPSByZXF1aXJlKFwiLi9tdXRhdGlvbi5qcy9cIik7XHJcbnZhciBjcm9zc292ZXIgPSByZXF1aXJlKFwiLi9jcm9zc292ZXIuanMvXCIpO1xyXG52YXIgY2x1c3RlciA9IHJlcXVpcmUoXCIuL2NsdXN0ZXJpbmcvY2x1c3RlclNldHVwLmpzL1wiKTtcclxudmFyIHJhbmRvbUludCA9IHJlcXVpcmUoXCIuL3JhbmRvbUludC5qcy9cIik7XHJcbnZhciBnZXRSYW5kb21JbnQgPSByYW5kb21JbnQuZ2V0UmFuZG9tSW50O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgZ2VuZXJhdGlvblplcm86IGdlbmVyYXRpb25aZXJvLFxyXG4gIG5leHRHZW5lcmF0aW9uOiBuZXh0R2VuZXJhdGlvblxyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0aW9uWmVybyhjb25maWcpe1xyXG4gIHZhciBnZW5lcmF0aW9uU2l6ZSA9IGNvbmZpZy5nZW5lcmF0aW9uU2l6ZSxcclxuICBzY2hlbWEgPSBjb25maWcuc2NoZW1hO1xyXG4gIHZhciB1c2VGaWxlID0gZmFsc2U7XHJcbiAgdmFyIGN3X2NhckdlbmVyYXRpb24gPSBbXTtcclxuICBpZih1c2VGaWxlPT09dHJ1ZSl7XHJcblx0ICBjd19jYXJHZW5lcmF0aW9uPSByZWFkRmlsZSgpO1xyXG4gIH1cclxuICBlbHNlIHtcclxuXHQgIGZvciAodmFyIGsgPSAwOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xyXG5cdFx0dmFyIGRlZiA9IGNyZWF0ZS5jcmVhdGVHZW5lcmF0aW9uWmVybyhzY2hlbWEsIGZ1bmN0aW9uKCl7XHJcblx0XHRyZXR1cm4gTWF0aC5yYW5kb20oKVxyXG5cdFx0fSk7XHJcblx0XHRkZWYuaW5kZXggPSBrO1xyXG5cdFx0Y3dfY2FyR2VuZXJhdGlvbi5wdXNoKGRlZik7XHJcblx0fVxyXG4gIH1cclxuICByZXR1cm4ge1xyXG4gICAgY291bnRlcjogMCxcclxuICAgIGdlbmVyYXRpb246IGN3X2NhckdlbmVyYXRpb24sXHJcbiAgfTtcclxufVxyXG5cclxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gbXkgY29kZSBqb2I2NFxyXG4vKlRoaXMgZnVuY3Rpb24gbG9hZHMgYW4gaW5pdGlhbCBjYXIgcG9wdWxhdGlvbiBmcm9tIGEgLmpzb24gZmlsZSovXHJcbmZ1bmN0aW9uIHJlYWRGaWxlKCl7XHJcblx0dmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcclxuXHR2YXIgYXJyYXkgPSBbXTtcclxuXHR2YXIgZmlsZSA9IHJlcXVpcmUoXCIuL2luaXRpYWxDYXJzLmpzb24vXCIpO1xyXG5cdGZvcih2YXIgaSA9IDA7aTxmaWxlLmFycmF5Lmxlbmd0aDtpKyspe1xyXG5cdFx0YXJyYXkucHVzaChmaWxlLmFycmF5W2ldKTtcclxuXHR9XHJcblx0cmV0dXJuIGFycmF5O1xyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gQ2hvb3NlcyB3aGljaCBzZWxlY3Rpb24gb3BlcmF0b3IgdG8gdXNlIGluIHRoZSBzZWxlY3Rpb24gb2YgdHdvIHBhcmVudHMgZm9yIHR3byBuZXcgY2FycyBzdWNoIGFzIGVpdGhlciBUb3VybmFtZW50IG9yIFJvdWxldHRlLXdoZWVsIHNlbGVjdGlvblxyXG5AcGFyYW0gcGFyZW50cyBPYmplY3RBcnJheSAtIEFkZGluZyB0aGUgc2VsZWN0ZWQgb2JqZWN0IGludG8gdGhpcyBhcnJheVxyXG5AcGFyYW0gc2NvcmVzIE9iamVjdEFycmF5IC0gQW4gYXJyYXkgb2YgY2FycyB3aGVyZSB0aGUgcGFyZW50cyB3aWxsIGJlIHNlbGVjdGVkIGZyb21cclxuQHBhcmFtIGluY3JlYXNlTWF0ZSBCb29sZWFuIC0gV2hldGhlciB0aGUgY3VycmVudCBzZWxlY3Rpb24gd2lsbCBpbmNsdWRlIGFuIGVsaXRlIHdoZXJlIGlmIHRydWUgaXQgd29udCBiZSBkZWxldGVkIGZyb20gdGhlIE9iamVjdCBhcnJheSBhbGxvd2luZyBpdCB0byBiZSB1c2VkIGFnYWluXHJcbkByZXR1cm4gcGFyZW50c1Njb3JlIGludCAtIHJldHVybnMgdGhlIGF2ZXJhZ2Ugc2NvcmUgb2YgdGhlIHBhcmVudHMqL1xyXG5mdW5jdGlvbiBzZWxlY3RQYXJlbnRzKHBhcmVudHMsIHNjb3JlcywgaW5jcmVhc2VNYXRlKXtcclxuXHR2YXIgcGFyZW50MSA9IHNlbGVjdGlvbi5ydW5TZWxlY3Rpb24oc2NvcmVzLChpbmNyZWFzZU1hdGU9PT1mYWxzZSk/MToyLHRydWUsIHRydWUsIGZhbHNlKTtcclxuXHRwYXJlbnRzLnB1c2gocGFyZW50MS5kZWYpO1xyXG5cdGlmKGluY3JlYXNlTWF0ZT09PWZhbHNlKXtcclxuXHRcdHNjb3Jlcy5zcGxpY2Uoc2NvcmVzLmZpbmRJbmRleCh4PT4geC5kZWYuaWQ9PT1wYXJlbnRzWzBdLmlkKSwxKTtcclxuXHR9XHJcblx0dmFyIHBhcmVudDIgPSBzZWxlY3Rpb24ucnVuU2VsZWN0aW9uKHNjb3JlcywoaW5jcmVhc2VNYXRlPT09ZmFsc2UpPzE6Mix0cnVlLCB0cnVlLCBmYWxzZSk7XHJcblx0cGFyZW50cy5wdXNoKHBhcmVudDIuZGVmKTtcclxuXHRzY29yZXMuc3BsaWNlKHNjb3Jlcy5maW5kSW5kZXgoeD0+IHguZGVmLmlkPT09cGFyZW50c1sxXS5pZCksMSk7XHJcblx0cmV0dXJuIChwYXJlbnQxLnNjb3JlLnMgKyBwYXJlbnQyLnNjb3JlLnMpLzI7XHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiBydW5zIGEgRXZvbHV0aW9uYXJ5IGFsZ29yaXRobSB3aGljaCB1c2VzIFNlbGVjdGlvbiwgQ3Jvc3NvdmVyIGFuZCBtdXRhdGlvbnMgdG8gY3JlYXRlIHRoZSBuZXcgcG9wdWxhdGlvbnMgb2YgY2Fycy5cclxuQHBhcmFtIHNjb3JlcyBPYmplY3RBcnJheSAtIEFuIGFycmF5IHdoaWNoIGhvbGRzIHRoZSBjYXIgb2JqZWN0cyBhbmQgdGhlcmUgcGVyZm9ybWFuY2Ugc2NvcmVzXHJcbkBwYXJhbSBjb25maWcgLSBUaGlzIGlzIHRoZSBnZW5lcmF0aW9uQ29uZmlnIGZpbGUgcGFzc2VkIHRocm91Z2ggd2hpY2ggZ2l2ZXMgdGhlIGNhcnMgdGVtcGxhdGUvYmx1ZXByaW50IGZvciBjcmVhdGlvblxyXG5AcGFyYW0gbm9DYXJzQ3JlYXRlZCBpbnQgLSBUaGUgbnVtYmVyIG9mIGNhcnMgdGhlcmUgY3VycmVudGx5IGV4aXN0IHVzZWQgZm9yIGNyZWF0aW5nIHRoZSBpZCBvZiBuZXcgY2Fyc1xyXG5AcmV0dXJuIG5ld0dlbmVyYXRpb24gT2JqZWN0QXJyYXkgLSBpcyByZXR1cm5lZCB3aXRoIGFsbCB0aGUgbmV3bHkgY3JlYXRlZCBjYXJzIHRoYXQgd2lsbCBiZSBpbiB0aGUgc2ltdWxhdGlvbiovXHJcbmZ1bmN0aW9uIHJ1bkVBKHNjb3JlcywgY29uZmlnLCBub0NhcnNDcmVhdGVkKXtcclxuXHRzY29yZXMuc29ydChmdW5jdGlvbihhLCBiKXtyZXR1cm4gYi5zY29yZS5zIC0gYS5zY29yZS5zO30pO1xyXG5cdHZhciBnZW5lcmF0aW9uU2l6ZT1zY29yZXMubGVuZ3RoO1xyXG5cdHZhciBuZXdHZW5lcmF0aW9uID0gbmV3IEFycmF5KCk7XHJcblx0dmFyIHJhbmRvbU1hdGVJbmNyZWFzZSA9IGdldFJhbmRvbUludCgwLG1heE5vTWF0ZXNJbmNyZWFzZXMsIG5ldyBBcnJheSgpKTtcclxuXHR2YXIgbWF4Tm9NYXRlc0luY3JlYXNlcyA9IDA7XHJcblx0dmFyIGN1cnJlbnROb01hdGVJbmNyZWFzZXMgPSAxO1xyXG5cdHZhciBub0VsaXRlcz0zO1xyXG5cdGZvcih2YXIgaT0wO2k8bm9FbGl0ZXM7aSsrKXsvL2FkZCBuZXcgZWxpdGVzIHRvIG5ld0dlbmVyYXRpb25cclxuXHRcdHZhciBuZXdFbGl0ZSA9IHNjb3Jlc1swXS5kZWY7XHJcblx0XHRuZXdFbGl0ZS5lbGl0ZSA9IHRydWU7XHJcblx0XHRuZXdHZW5lcmF0aW9uLnB1c2gobmV3RWxpdGUpO1xyXG5cdH1cclxuXHRmb3IodmFyIGsgPSAwO2s8Z2VuZXJhdGlvblNpemUvMjtrKyspe1xyXG5cdFx0aWYobmV3R2VuZXJhdGlvbi5sZW5ndGghPT1nZW5lcmF0aW9uU2l6ZSl7XHJcblx0XHR2YXIgcGlja2VkUGFyZW50cyA9IFtdO1xyXG5cdFx0dmFyIHBhcmVudHNTY29yZSA9IHNlbGVjdFBhcmVudHMocGlja2VkUGFyZW50cywgc2NvcmVzLCAoKGs9PT1yYW5kb21NYXRlSW5jcmVhc2UpJiYoY3VycmVudE5vTWF0ZUluY3JlYXNlczxtYXhOb01hdGVzSW5jcmVhc2VzKSk/dHJ1ZTpmYWxzZSk7IFxyXG5cdFx0aWYoY3VycmVudE5vTWF0ZUluY3JlYXNlczxtYXhOb01hdGVzSW5jcmVhc2VzKXtjdXJyZW50Tm9NYXRlSW5jcmVhc2VzKys7fVxyXG5cdFx0XHR2YXIgbmV3Q2FycyA9IGNyb3Nzb3Zlci5ydW5Dcm9zc292ZXIocGlja2VkUGFyZW50cywwLGNvbmZpZy5zY2hlbWEsIHBhcmVudHNTY29yZSwgbm9DYXJzQ3JlYXRlZCwgKG5ld0dlbmVyYXRpb24ubGVuZ3RoPT09Z2VuZXJhdGlvblNpemUtMSk/MToyKTtcclxuXHRcdFx0Zm9yKHZhciBpPTA7aTxuZXdDYXJzLmxlbmd0aDtpKyspe1xyXG5cdFx0XHRcdG5ld0NhcnNbaV0uZWxpdGUgPSBmYWxzZTtcclxuXHRcdFx0XHRuZXdDYXJzW2ldLmluZGV4ID0gaztcclxuXHRcdFx0XHRuZXdHZW5lcmF0aW9uLnB1c2gobmV3Q2Fyc1tpXSk7XHJcblx0XHRcdFx0bm9DYXJzQ3JlYXRlZCsrOy8vIHVzZWQgaW4gY2FyIGlkIGNyZWF0aW9uXHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHR9XHRcclxuXHRuZXdHZW5lcmF0aW9uLnNvcnQoZnVuY3Rpb24oYSwgYil7cmV0dXJuIGEucGFyZW50c1Njb3JlIC0gYi5wYXJlbnRzU2NvcmU7fSk7XHJcblx0Zm9yKHZhciB4ID0gMDt4PG5ld0dlbmVyYXRpb24ubGVuZ3RoO3grKyl7XHJcblx0XHRcdHZhciBjdXJyZW50SUQgPSBuZXdHZW5lcmF0aW9uW3hdLmlkO1xyXG5cdFx0XHRpZihuZXdHZW5lcmF0aW9uW3hdLmVsaXRlPT09ZmFsc2Upe1xyXG5cdFx0XHRcdC8vbmV3R2VuZXJhdGlvblt4XSA9IG11dGF0aW9uLm11bHRpTXV0YXRpb25zKG5ld0dlbmVyYXRpb25beF0sbmV3R2VuZXJhdGlvbi5maW5kSW5kZXgoeD0+IHguaWQ9PT1jdXJyZW50SUQpLDIwKTtcclxuXHRcdFx0XHRuZXdHZW5lcmF0aW9uW3hdID0gbXV0YXRpb24ubXV0YXRlKG5ld0dlbmVyYXRpb25beF0pO1xyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRjb25zb2xlLmxvZyhuZXdHZW5lcmF0aW9uKTtcclxuXHRyZXR1cm4gbmV3R2VuZXJhdGlvbjtcclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHJ1bnMgdGhlIEJhc2VsaW5lIEV2b2x1dGlvbmFyeSBhbGdvcml0aG0gd2hpY2ggb25seSBydW5zIGEgbXV0YXRpb24gb3IgbXVsdGlNdXRhdGlvbnMgb3ZlciBhbGwgdGhlIGNhcnMgcGFzc2VkIHRob3VnaCBpbiB0aGUgc2NvcmVzIHBhcmFtZXRlci5cclxuQHBhcmFtIHNjb3JlcyBBcnJheSAtIFRoaXMgcGFyYW1ldGVyIGlzIGFuIGFycmF5IG9mIGNhcnMgdGhhdCBob2xkcyB0aGUgc2NvcmUgc3RhdGlzdGljcyBhbmQgY2FyIGRhdGEgc3VjaCBhcyBpZCBhbmQgXCJ3aGVlbF9yYWRpdXNcIiwgXCJjaGFzc2lzX2RlbnNpdHlcIiwgXCJ2ZXJ0ZXhfbGlzdFwiLCBcIndoZWVsX3ZlcnRleFwiIGFuZCBcIndoZWVsX2RlbnNpdHlcIlxyXG5AcGFyYW0gY29uZmlnIC0gVGhpcyBwYXNzZXMgYSBmaWxlIHdpdGggZnVuY3Rpb25zIHRoYXQgY2FuIGJlIGNhbGxlZC5cclxuQHJldHVybiBuZXdHZW5lcmF0aW9uIC0gdGhpcyBpcyB0aGUgbmV3IHBvcHVsYXRpb24gdGhhdCBoYXZlIGhhZCBtdXRhdGlvbnMgYXBwbGllZCB0byB0aGVtLiovXHJcbmZ1bmN0aW9uIHJ1bkJhc2VsaW5lRUEoc2NvcmVzLCBjb25maWcpe1xyXG5cdHNjb3Jlcy5zb3J0KGZ1bmN0aW9uKGEsIGIpe3JldHVybiBhLnNjb3JlLnMgLSBiLnNjb3JlLnM7fSk7XHJcblx0dmFyIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWE7Ly9saXN0IG9mIGNhciB2YXJpYWJsZXMgaS5lIFwid2hlZWxfcmFkaXVzXCIsIFwiY2hhc3Npc19kZW5zaXR5XCIsIFwidmVydGV4X2xpc3RcIiwgXCJ3aGVlbF92ZXJ0ZXhcIiBhbmQgXCJ3aGVlbF9kZW5zaXR5XCJcclxuXHR2YXIgbmV3R2VuZXJhdGlvbiA9IG5ldyBBcnJheSgpO1xyXG5cdHZhciBnZW5lcmF0aW9uU2l6ZT1zY29yZXMubGVuZ3RoO1xyXG5cdGNvbnNvbGUubG9nKHNjb3Jlcyk7Ly90ZXN0IGRhdGFcclxuXHRmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcclxuXHRcdC8vbmV3R2VuZXJhdGlvbi5wdXNoKG11dGF0aW9uLm11dGF0ZShzY29yZXNba10uZGVmKSk7XHJcblx0XHRuZXdHZW5lcmF0aW9uLnB1c2gobXV0YXRpb24ubXVsdGlNdXRhdGlvbnMoc2NvcmVzW2tdLmRlZixzY29yZXMuZmluZEluZGV4KHg9PiB4LmRlZi5pZD09PXNjb3Jlc1trXS5kZWYuaWQpLDIwKSk7XHJcblx0XHRuZXdHZW5lcmF0aW9uW2tdLmlzX2VsaXRlID0gZmFsc2U7XHJcblx0XHRuZXdHZW5lcmF0aW9uW2tdLmluZGV4ID0gaztcclxuXHR9XHJcblx0XHJcblx0cmV0dXJuIG5ld0dlbmVyYXRpb247XHJcbn1cdFxyXG5cclxuLypcclxuVGhpcyBmdW5jdGlvbiBoYW5kbGVzIHRoZSBjaG9vc2luZyBvZiB3aGljaCBFdm9sdXRpb25hcnkgYWxnb3JpdGhtIHRvIHJ1biBhbmQgcmV0dXJucyB0aGUgbmV3IHBvcHVsYXRpb24gdG8gdGhlIHNpbXVsYXRpb24qL1xyXG5mdW5jdGlvbiBuZXh0R2VuZXJhdGlvbihwcmV2aW91c1N0YXRlLCBzY29yZXMsIGNvbmZpZyl7XHJcblx0dmFyIGdlbmVyYXRpb25TaXplPXNjb3Jlcy5sZW5ndGg7XHJcblx0dmFyIG5ld0dlbmVyYXRpb24gPSBuZXcgQXJyYXkoKTtcclxuXHR2YXIgY291bnQ7XHJcblx0dmFyIHRlbXBSb3VuZD0wO1xyXG5cdFxyXG5cdFx0dGVtcFJvdW5kPSh0eXBlb2YgcHJldmlvdXNTdGF0ZS5yb3VuZCA9PT1cInVuZGVmaW5lZFwiKT8wOnByZXZpb3VzU3RhdGUucm91bmQ7XHJcblx0XHRjb3VudCA9IHByZXZpb3VzU3RhdGUuY291bnRlciArIDE7XHJcblx0XHQvL3ZhciBjbHVzdGVySW50ID0gKHByZXZpb3VzU3RhdGUuY291bnRlcj09PTApP2NsdXN0ZXIuc2V0dXAoc2NvcmVzLG51bGwsZmFsc2UpOmNsdXN0ZXIuc2V0dXAoc2NvcmVzLHByZXZpb3VzU3RhdGUuY2x1c3QsdHJ1ZSk7XHJcblx0XHQvL2NsdXN0ZXIucmVTY29yZUNhcnMoc2NvcmVzICxjbHVzdGVySW50KTtcclxuXHRcdHNjb3Jlcy5zb3J0KGZ1bmN0aW9uKGEsIGIpe3JldHVybiBhLnNjb3JlLnMgLSBiLnNjb3JlLnM7fSk7XHJcblx0XHR2YXIgbnVtYmVyT2ZDYXJzID0gKHByZXZpb3VzU3RhdGUuY291bnRlcj09PTApP2dlbmVyYXRpb25TaXplOnByZXZpb3VzU3RhdGUubm9DYXJzK2dlbmVyYXRpb25TaXplO1xyXG5cdFx0dmFyIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWE7Ly9saXN0IG9mIGNhciB2YXJpYWJsZXMgaS5lIFwid2hlZWxfcmFkaXVzXCIsIFwiY2hhc3Npc19kZW5zaXR5XCIsIFwidmVydGV4X2xpc3RcIiwgXCJ3aGVlbF92ZXJ0ZXhcIlxyXG5cdFxyXG5cdFx0Y29uc29sZS5sb2coXCJMb2cgLS0gXCIrcHJldmlvdXNTdGF0ZS5jb3VudGVyKTtcclxuXHRcdC8vY29uc29sZS5sb2coc2NvcmVzRGF0YSk7Ly90ZXN0IGRhdGFcclxuXHRcdHZhciBlYVR5cGUgPSAxO1xyXG5cdFx0bmV3R2VuZXJhdGlvbiA9IChlYVR5cGU9PT0xKT9ydW5FQShzY29yZXMsIGNvbmZpZywgbnVtYmVyT2ZDYXJzLCBwcmV2aW91c1N0YXRlLnN0YXRlQXZlcmFnZXNBcnIpOnJ1bkJhc2VsaW5lRUEoc2NvcmVzLCBjb25maWcpO1xyXG5cdFx0Ly9jb25zb2xlLmxvZyhuZXdHZW5lcmF0aW9uKTsvL3Rlc3QgZGF0YVxyXG5cdGlmKHByZXZpb3VzU3RhdGUuY291bnRlcj4xNTApe1xyXG5cdFx0Y291bnQ9MDtcclxuXHRcdHRlbXBSb3VuZCsrO1xyXG5cdFx0Ly9uZXdHZW5lcmF0aW9uPWdlbmVyYXRpb25aZXJvKGNvbmZpZykuZ2VuZXJhdGlvbjtcclxuXHRcdFxyXG5cdH1cclxuXHRcclxuICByZXR1cm4ge1xyXG4gICAgY291bnRlcjogY291bnQsXHJcbiAgICBnZW5lcmF0aW9uOiBuZXdHZW5lcmF0aW9uLFxyXG5cdC8vY2x1c3Q6IGNsdXN0ZXJJbnQsXHJcblx0bm9DYXJzOiBudW1iZXJPZkNhcnMsXHJcblx0cm91bmQ6IHRlbXBSb3VuZFxyXG4gIH07XHJcbn1cclxuXHJcblxyXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBlbmQgb2YgbXkgY29kZSBqb2I2NFxyXG5cclxuXHJcbmZ1bmN0aW9uIG1ha2VDaGlsZChjb25maWcsIHBhcmVudHMpe1xyXG4gIHZhciBzY2hlbWEgPSBjb25maWcuc2NoZW1hLFxyXG4gICAgcGlja1BhcmVudCA9IGNvbmZpZy5waWNrUGFyZW50O1xyXG4gIHJldHVybiBjcmVhdGUuY3JlYXRlQ3Jvc3NCcmVlZChzY2hlbWEsIHBhcmVudHMsIHBpY2tQYXJlbnQpXHJcbn1cclxuXHJcblxyXG5cclxuZnVuY3Rpb24gbXV0YXRlKGNvbmZpZywgcGFyZW50KXtcclxuICB2YXIgc2NoZW1hID0gY29uZmlnLnNjaGVtYSxcclxuICAgIG11dGF0aW9uX3JhbmdlID0gY29uZmlnLm11dGF0aW9uX3JhbmdlLFxyXG4gICAgZ2VuX211dGF0aW9uID0gY29uZmlnLmdlbl9tdXRhdGlvbixcclxuICAgIGdlbmVyYXRlUmFuZG9tID0gY29uZmlnLmdlbmVyYXRlUmFuZG9tO1xyXG4gIHJldHVybiBjcmVhdGUuY3JlYXRlTXV0YXRlZENsb25lKFxyXG4gICAgc2NoZW1hLFxyXG4gICAgZ2VuZXJhdGVSYW5kb20sXHJcbiAgICBwYXJlbnQsXHJcbiAgICBNYXRoLm1heChtdXRhdGlvbl9yYW5nZSksXHJcbiAgICBnZW5fbXV0YXRpb25cclxuICApXHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0bXV0YXRlOiBtdXRhdGUsXHJcblx0bXVsdGlNdXRhdGlvbnM6IG11bHRpTXV0YXRpb25zXHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiByZXR1cm5zIHdob2xlIGludHMgYmV0d2VlbiBhIG1pbmltdW0gYW5kIG1heGltdW1cclxuQHBhcmFtIG1pbiBpbnQgLSBUaGUgbWluaW11bSBpbnQgdGhhdCBjYW4gYmUgcmV0dXJuZWRcclxuQHBhcmFtIG1heCBpbnQgLSBUaGUgbWF4aW11bSBpbnQgdGhhdCBjYW4gYmUgcmV0dXJuZWRcclxuQHBhcmFtIG5vdEVxdWFsc0FyciBpbnRBcnJheSAtIEFuIGFycmF5IG9mIHRoZSBpbnRzIHRoYXQgdGhlIGZ1bmN0aW9uIHNob3VsZCBub3QgcmV0dXJuXHJcbkByZXR1cm4gaW50IC0gVGhlIGludCB3aXRoaW4gdGhlIHNwZWNpZmllZCBwYXJhbWV0ZXIgYm91bmRzIGlzIHJldHVybmVkLiovXHJcbmZ1bmN0aW9uIGdldFJhbmRvbUludChtaW4sIG1heCwgbm90RXF1YWxzQXJyKSB7XHJcblx0dmFyIHRvUmV0dXJuO1xyXG5cdHZhciBydW5Mb29wID0gdHJ1ZTtcclxuXHR3aGlsZShydW5Mb29wPT09dHJ1ZSl7XHJcblx0XHRtaW4gPSBNYXRoLmNlaWwobWluKTtcclxuXHRcdG1heCA9IE1hdGguZmxvb3IobWF4KTtcclxuXHRcdHRvUmV0dXJuID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcclxuXHRcdGlmKHR5cGVvZiBmaW5kSWZFeGlzdHMgPT09IFwidW5kZWZpbmVkXCIpe1xyXG5cdFx0XHRydW5Mb29wPWZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZihub3RFcXVhbHNBcnIuZmluZChmdW5jdGlvbih2YWx1ZSl7cmV0dXJuIHZhbHVlPT09dG9SZXR1cm47fSk9PT1mYWxzZSl7XHJcblx0XHRcdHJ1bkxvb3A9ZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG4gICAgcmV0dXJuIHRvUmV0dXJuOy8vKHR5cGVvZiBmaW5kSWZFeGlzdHMgPT09IFwidW5kZWZpbmVkXCIpP3RvUmV0dXJuOmdldFJhbmRvbUludChtaW4sIG1heCwgbm90RXF1YWxzQXJyKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGNoYW5nZUFycmF5VmFsdWUob3JpZ2luYWxWYWx1ZSl7XHJcblx0Zm9yKHZhciBpPTA7aTxvcmlnaW5hbFZhbHVlLmxlbmd0aDtpKyspe1xyXG5cdFx0dmFyIHJhbmRvbUZsb2F0ID0gTWF0aC5yYW5kb20oKTtcclxuXHRcdHZhciBtdXRhdGlvblJhdGUgPSAwLjUqcmFuZG9tRmxvYXQ7Ly9NYXRoLnJhbmRvbSgpO1xyXG5cdFx0dmFyIGluY3JlYXNlT3JEZWNyZWFzZSA9IGdldFJhbmRvbUludCgwLDEsW10pO1xyXG5cdFx0bmV3VmFsdWUgPSAoaW5jcmVhc2VPckRlY3JlYXNlPT09MCk/b3JpZ2luYWxWYWx1ZVtpXS1tdXRhdGlvblJhdGU6b3JpZ2luYWxWYWx1ZVtpXSttdXRhdGlvblJhdGU7XHJcblx0XHRpZihuZXdWYWx1ZTwwKXtcclxuXHRcdFx0bmV3VmFsdWUgPSBvcmlnaW5hbFZhbHVlW2ldK211dGF0aW9uUmF0ZTtcclxuXHRcdH0gZWxzZSBpZihuZXdWYWx1ZT4xKXtcclxuXHRcdFx0bmV3VmFsdWUgPSBvcmlnaW5hbFZhbHVlW2ldLW11dGF0aW9uUmF0ZTtcclxuXHRcdH1cclxuXHRcdG9yaWdpbmFsVmFsdWVbaV0gPSBuZXdWYWx1ZTtcclxuXHR9XHJcblx0cmV0dXJuIG9yaWdpbmFsVmFsdWU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG11dGF0ZShjYXIpe1xyXG5cdHJldHVybiBjaGFuZ2VEYXRhKGNhcixuZXcgQXJyYXkoKSwxKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2hhbmdlRGF0YShjYXIsIG11bHRpTXV0YXRpb25zLCBub011dGF0aW9ucyl7XHJcblx0dmFyIHJhbmRvbUludCA9IGdldFJhbmRvbUludCgxLDQsIG11bHRpTXV0YXRpb25zKTtcclxuXHRpZihyYW5kb21JbnQ9PT0xKXtcclxuXHRcdGNhci5jaGFzc2lzX2RlbnNpdHk9Y2hhbmdlQXJyYXlWYWx1ZShjYXIuY2hhc3Npc19kZW5zaXR5KTtcclxuXHR9XHJcblx0ZWxzZSBpZihyYW5kb21JbnQ9PT0yKXtcclxuXHRcdGNhci52ZXJ0ZXhfbGlzdD1jaGFuZ2VBcnJheVZhbHVlKGNhci52ZXJ0ZXhfbGlzdCk7XHJcblx0fVxyXG5cdGVsc2UgaWYocmFuZG9tSW50PT09Myl7XHJcblx0XHRjYXIud2hlZWxfZGVuc2l0eT1jaGFuZ2VBcnJheVZhbHVlKGNhci53aGVlbF9kZW5zaXR5KTtcclxuXHR9XHJcblx0ZWxzZSBpZihyYW5kb21JbnQ9PT00KXtcclxuXHRcdGNhci53aGVlbF9yYWRpdXM9Y2hhbmdlQXJyYXlWYWx1ZShjYXIud2hlZWxfcmFkaXVzKTtcclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRjYXIud2hlZWxfdmVydGV4PWNoYW5nZUFycmF5VmFsdWUoY2FyLndoZWVsX3ZlcnRleCk7XHJcblx0fVxyXG5cdG11bHRpTXV0YXRpb25zLnB1c2gocmFuZG9tSW50KTtcclxuXHRub011dGF0aW9ucy0tO1xyXG5cdHJldHVybiAobm9NdXRhdGlvbnM9PT0wKT9jYXI6Y2hhbmdlRGF0YShjYXIsIG11bHRpTXV0YXRpb25zLCBub011dGF0aW9ucyk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIG11bHRpTXV0YXRpb25zKGNhciwgYXJyUG9zaXRpb24sIGFyclNpemUpe1xyXG5cdC8vdmFyIG5vTXV0YXRpb25zID0gKGFyclBvc2l0aW9uPChhcnJTaXplLzIpKT8oYXJyUG9zaXRpb248KGFyclNpemUvNCkpPzQ6MzooYXJyUG9zaXRpb24+YXJyU2l6ZS0oYXJyU2l6ZS80KSk/MToyO1xyXG5cdHZhciBub011dGF0aW9ucyA9IChhcnJQb3NpdGlvbjwxMCk/MzoxO1xyXG5cdHJldHVybiBjaGFuZ2VEYXRhKGNhciwgbmV3IEFycmF5KCksbm9NdXRhdGlvbnMpO1xyXG59IiwiIG1vZHVsZS5leHBvcnRzID0ge1xyXG5cdGdldFJhbmRvbUludDogZ2V0UmFuZG9tSW50XHJcbiB9XHJcbiBcclxuLypUaGlzIGlzIGEgcmVjdXJzaXZlIGZ1bmN0aW9uIHdoaWNoIHJldHVybnMgd2hvbGUgaW50cyBiZXR3ZWVuIGEgbWluaW11bSBhbmQgbWF4aW11bVxyXG5AcGFyYW0gbWluIGludCAtIFRoZSBtaW5pbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbWF4IGludCAtIFRoZSBtYXhpbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbm90RXF1YWxzQXJyIGludEFycmF5IC0gQW4gYXJyYXkgb2YgdGhlIGludHMgdGhhdCB0aGUgZnVuY3Rpb24gc2hvdWxkIG5vdCByZXR1cm5cclxuQHJldHVybiBpbnQgLSBUaGUgaW50IHdpdGhpbiB0aGUgc3BlY2lmaWVkIHBhcmFtZXRlciBib3VuZHMgaXMgcmV0dXJuZWQuKi9cclxuZnVuY3Rpb24gZ2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpIHtcclxuXHR2YXIgdG9SZXR1cm47XHJcblx0dmFyIHJ1bkxvb3AgPSB0cnVlO1xyXG5cdHdoaWxlKHJ1bkxvb3A9PT10cnVlKXtcclxuXHRcdG1pbiA9IE1hdGguY2VpbChtaW4pO1xyXG5cdFx0bWF4ID0gTWF0aC5mbG9vcihtYXgpO1xyXG5cdFx0dG9SZXR1cm4gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xyXG5cdFx0aWYodHlwZW9mIGZpbmRJZkV4aXN0cyA9PT0gXCJ1bmRlZmluZWRcIil7XHJcblx0XHRcdHJ1bkxvb3A9ZmFsc2U7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKG5vdEVxdWFsc0Fyci5maW5kKGZ1bmN0aW9uKHZhbHVlKXtyZXR1cm4gdmFsdWU9PT10b1JldHVybjt9KT09PWZhbHNlKXtcclxuXHRcdFx0cnVuTG9vcD1mYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcbiAgICByZXR1cm4gdG9SZXR1cm47Ly8odHlwZW9mIGZpbmRJZkV4aXN0cyA9PT0gXCJ1bmRlZmluZWRcIik/dG9SZXR1cm46Z2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpO1xyXG59IiwiLy92YXIgcmFuZG9tSW50ID0gcmVxdWlyZShcIi4vcmFuZG9tSW50LmpzL1wiKTtcclxuLy92YXIgZ2V0UmFuZG9tSW50ID0gcmFuZG9tSW50LmdldFJhbmRvbUludDtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdHJ1blNlbGVjdGlvbjogcnVuU2VsZWN0aW9uXHJcbn1cclxuLypcclxuVGhpcyBmdW5jdGlvbiBjaGFuZ2VzIHRoZSB0eXBlIG9mIHNlbGVjdGlvbiB1c2VkIGRlcGVuZGluZyBvbiB0aGUgcGFyYW1ldGVyIG51bWJlciBcInNlbGVjdFR5cGVcIiA9IChyb3VsZXRlV2hlZWxTZWwgLSAxLCB0b3VybmFtZW50U2VsZWN0aW9uIC0gMilcclxuQHBhcmFtIHN0cm9uZ2VzdCBib29sZWFuICAtIHRoaXMgcGFyYW1ldGVyIGlzIHBhc3NlZCB0aHJvdWdoIHRvIHRoZSB0b3VybmFtZW50U2VsZWN0aW9uIGZ1bmN0aW9uIHdoZXJlIHRydWUgaXMgcmV0dXJuIHRoZSBzdHJvbmdlc3QgYW5kIGZhbHNlIGdldCB3ZWFrZXN0XHJcbkBwYXJhbSBzZWxlY3RUeXBlIGludCAtIHRoaXMgcGFyYW1ldGVyIGRldGVybWluZXMgdGhlIHR5cGUgb2Ygc2VsZWN0aW9uIHVzZWQuXHJcbkBwYXJhbSBjYXJzQXJyIEFycmF5IC0gdGhpcyBwYXJhbWV0ZXIgaXMgdGhlIHBvcHVsYXRpb24gd2hpY2ggdGhlIHNlbGVjdGlvbiBmdW5jdGlvbnMgYXJlIHVzZWQgb24uXHJcbkBwYXJhbSB1c2VTdWJTZXQgYm9vbGVhbiAtIHRydWUgaWYgeW91IHdhbnQgdG91cm5hbWVudFNlbGVjdGlvbiB0byB1c2Ugc3ViIHNldHMgbm90IHRoZSBnbG9iYWwgcG9wdWxhdGlvblxyXG5AcmV0dXJuIE9iamVjdEFycmF5IC0gdGhlIHBhcmVudHMgYXJyYXkgb2YgdHdvIGlzIHJldHVybmVkIGZyb20gZWl0aGVyIHRvdXJuYW1lbnQgb3Igcm91bGxldGUgd2hlZWwgc2VsZWN0aW9uKi9cclxuZnVuY3Rpb24gcnVuU2VsZWN0aW9uKGNhcnNBcnIsIHNlbGVjdFR5cGUsIHN0cm9uZ2VzdCwgdXNlU3ViU2V0LCB1bmlmb3JtKXtcclxuXHRpZihzZWxlY3RUeXBlPT09MSl7XHJcblx0XHRyZXR1cm4gcm91bGV0ZVdoZWVsU2VsKGNhcnNBcnIsIHVuaWZvcm0pO1xyXG5cdH0gXHJcblx0ZWxzZSBpZihzZWxlY3RUeXBlPT09Mil7XHJcblx0XHRyZXR1cm4gdG91cm5hbWVudFNlbGVjdGlvbihjYXJzQXJyLHN0cm9uZ2VzdCxjYXJzQXJyLmxlbmd0aC80LCB1c2VTdWJTZXQpO1xyXG5cdH1cclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHVzZXMgZmluZXNzIHByb3BvcnRpb25hdGUgc2VsZWN0aW9uIHdoZXJlIGEgcHJvcG9ydGlvbiBvZiB0aGUgd2hlZWwgaXMgZ2l2ZW4gdG8gYSBjYXIgYmFzZWQgb24gZml0bmVzc1xyXG5AcGFyYW0gY2Fyc0FyciBPYmplY3RBcnJheSAtIFRoZSBhcnJheSBvZiBjYXJzIHdoZXJlIHRoZSBwYXJlbnRzIGFyZSBjaG9zZW4gZnJvbVxyXG5AcGFyYW0gdW5pZm9ybSBib29sZWFuIC0gd2hldGhlciB0aGUgc2VsZWN0aW9uIHNob3VsZCBiZSB1bmlmb3JtXHJcbkByZXR1cm4gY2FyIE9iamVjdCAtIEEgY2FyIG9iamVjdCBpcyByZXR1cm5lZCBhZnRlciBzZWxlY3Rpb24qL1xyXG5mdW5jdGlvbiByb3VsZXRlV2hlZWxTZWwoY2Fyc0FyciwgdW5pZm9ybSl7XHJcblx0aWYodW5pZm9ybSA9PT1mYWxzZSl7XHJcblx0XHR2YXIgc3VtQ2FyU2NvcmUgPSAwO1xyXG5cdFx0Zm9yKHZhciBpID0wO2k8Y2Fyc0Fyci5sZW5ndGg7aSsrKXtcclxuXHRcdFx0c3VtQ2FyU2NvcmUgKz0gY2Fyc0FycltpXS5zY29yZS5zO1xyXG5cdFx0fVxyXG5cdFx0Lypjb25zb2xlLmxvZyhcInNlbGVjdGlvbiBkYXRhIC1cIik7XHJcblx0XHRjb25zb2xlLmxvZyhjYXJzQXJyLmxlbmd0aCk7XHJcblx0XHRjb25zb2xlLmxvZyhzdW1DYXJTY29yZSk7Ly90ZXN0IG5vXHJcblx0XHQqL1xyXG5cdFx0dmFyIG5vID0gTWF0aC5yYW5kb20oKSAqIHN1bUNhclNjb3JlO1xyXG5cdFx0aWYoc3VtQ2FyU2NvcmUhPTApe1xyXG5cdFx0XHRmb3IodmFyIHggPTA7eDxjYXJzQXJyLmxlbmd0aDt4Kyspe1xyXG5cdFx0XHRcdG5vIC09IGNhcnNBcnJbeF0uc2NvcmUucztcclxuXHRcdFx0XHRpZihubzwwKXtcclxuXHRcdFx0XHRcdC8vY29uc29sZS5sb2coY2Fyc0Fyclt4XSk7Ly9yZXR1cm5lZCBjYXJcclxuXHRcdFx0XHRcdHJldHVybiBjYXJzQXJyW3hdO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0XHRcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0ZWxzZXtcclxuXHRcdFx0cmV0dXJuIGNhcnNBcnJbMF07XHJcblx0XHR9XHJcblx0fSBlbHNlIHtcclxuXHRcdHZhciByYW5kTm8gPSBnZXRSYW5kb21JbnQoMCwgY2Fyc0Fyci5sZW5ndGgtMSxbXSk7XHJcblx0XHRyZXR1cm4gY2Fyc0FycltyYW5kTm9dO1xyXG5cdH1cclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHVzZXMgdG91cm5hbWVudFNlbGVjdGlvbiB3aGVyZSBhIGFycmF5IGlzIHNvcnRlZCBhbmQgdGhlIHN0cm9uZ2VzdCBvciB3ZWFrZXN0IGlzIHJldHVybmVkXHJcbkBwYXJhbSBjYXJzQXJyIE9iamVjdEFycmF5IC0gVGhlIGFycmF5IG9mIGNhcnMgd2hlcmUgdGhlIHBhcmVudHMgYXJlIGNob3NlbiBmcm9tXHJcbkBwYXJhbSBzdHJvbmdlc3QgQm9vbGVhbiAtIGlmIHRydWUgdGhlIHN0cm9uZ2VzdCBjYXIgaXMgY2hvc2VuLCBlbHNlIGlmIGZhbHNlIHRoZSB3ZWFrZXN0IGlzIHJldHVybmVkIFxyXG5AcGFyYW0gc3ViU2V0UmFuZ2UgaW50IC0gSG93IGJpZyB0aGUgc3ViU2V0IG9mIHRoZSBnbG9iYWwgYXJyYXkgc2hvdWxkIGJlXHJcbkBwYXJhbSB1c2VTdWJTZXQgYm9vbGVhbiAtIHRydWUgaWYgeW91IHdhbnQgdG8gdXNlIHN1YiBzZXQgb2YgcmFuZG9tbHkgY2hvc2VuIG9iamVjdHMgZnJvbSB0aGUgZ2xvYmFsLCBvciBmYWxzZSB0byBqdXN0IHVzZSB0aGUgZ2xvYmFsXHJcbkByZXR1cm4gY2FyIE9iamVjdCAtIEEgY2FyIG9iamVjdCBpcyByZXR1cm5lZCBhZnRlciBzZWxlY3Rpb24qL1xyXG5mdW5jdGlvbiB0b3VybmFtZW50U2VsZWN0aW9uKGNhcnNBcnIsIHN0cm9uZ2VzdCwgc3ViU2V0UmFuZ2UsIHVzZVN1YlNldCl7XHJcblx0dmFyIHN1YlNldCA9IFtdO1xyXG5cdGlmKHVzZVN1YlNldD09PXRydWUpe1xyXG5cdHZhciBjaG9zZW5JbnRzID0gW107XHJcblx0Zm9yKHZhciBpID0wO2k8c3ViU2V0UmFuZ2U7aSsrKXtcclxuXHRcdHZhciBjaG9zZW5ObyA9IGdldFJhbmRvbUludCgwLGNhcnNBcnIubGVuZ3RoLTEsY2hvc2VuSW50cyk7XHJcblx0XHRjaG9zZW5JbnRzLnB1c2goY2hvc2VuTm8pO1xyXG5cdFx0c3ViU2V0LnB1c2goY2Fyc0FycltjaG9zZW5Ob10pO1xyXG5cdH1cclxuXHR9XHJcblx0KHVzZVN1YlNldD09PXRydWUpP3N1YlNldDpjYXJzQXJyLnNvcnQoZnVuY3Rpb24oYSxiKXtyZXR1cm4gKHN0cm9uZ2VzdD09PXRydWUpP2Iuc2NvcmUucyAtIGEuc2NvcmUuczphLnNjb3JlLnMgLSBhLnNjb3JlLmI7fSk7XHJcblx0cmV0dXJuICh1c2VTdWJTZXQ9PT10cnVlKT9zdWJTZXRbMF06Y2Fyc0FyclswXTtcclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHJldHVybnMgd2hvbGUgaW50cyBiZXR3ZWVuIGEgbWluaW11bSBhbmQgbWF4aW11bVxyXG5AcGFyYW0gbWluIGludCAtIFRoZSBtaW5pbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbWF4IGludCAtIFRoZSBtYXhpbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbm90RXF1YWxzQXJyIGludEFycmF5IC0gQW4gYXJyYXkgb2YgdGhlIGludHMgdGhhdCB0aGUgZnVuY3Rpb24gc2hvdWxkIG5vdCByZXR1cm5cclxuQHJldHVybiBpbnQgLSBUaGUgaW50IHdpdGhpbiB0aGUgc3BlY2lmaWVkIHBhcmFtZXRlciBib3VuZHMgaXMgcmV0dXJuZWQuKi9cclxuZnVuY3Rpb24gZ2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpIHtcclxuXHR2YXIgdG9SZXR1cm47XHJcblx0dmFyIHJ1bkxvb3AgPSB0cnVlO1xyXG5cdHdoaWxlKHJ1bkxvb3A9PT10cnVlKXtcclxuXHRcdG1pbiA9IE1hdGguY2VpbChtaW4pO1xyXG5cdFx0bWF4ID0gTWF0aC5mbG9vcihtYXgpO1xyXG5cdFx0dG9SZXR1cm4gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xyXG5cdFx0aWYodHlwZW9mIGZpbmRJZkV4aXN0cyA9PT0gXCJ1bmRlZmluZWRcIil7XHJcblx0XHRcdHJ1bkxvb3A9ZmFsc2U7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKG5vdEVxdWFsc0Fyci5maW5kKGZ1bmN0aW9uKHZhbHVlKXtyZXR1cm4gdmFsdWU9PT10b1JldHVybjt9KT09PWZhbHNlKXtcclxuXHRcdFx0cnVuTG9vcD1mYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcbiAgICByZXR1cm4gdG9SZXR1cm47Ly8odHlwZW9mIGZpbmRJZkV4aXN0cyA9PT0gXCJ1bmRlZmluZWRcIik/dG9SZXR1cm46Z2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpO1xyXG59XHJcblxyXG4iLCJcclxuXHJcbmNvbnN0IHJhbmRvbSA9IHtcclxuICBzaHVmZmxlSW50ZWdlcnMocHJvcCwgZ2VuZXJhdG9yKXtcclxuICAgIHJldHVybiByYW5kb20ubWFwVG9TaHVmZmxlKHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcclxuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aCB8fCAxMCxcclxuICAgICAgaW5jbHVzaXZlOiB0cnVlLFxyXG4gICAgfSwgZ2VuZXJhdG9yKSk7XHJcbiAgfSxcclxuICBjcmVhdGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3Ipe1xyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0ludGVnZXIocHJvcCwgcmFuZG9tLmNyZWF0ZU5vcm1hbHMoe1xyXG4gICAgICBsZW5ndGg6IHByb3AubGVuZ3RoLFxyXG4gICAgICBpbmNsdXNpdmU6IHRydWUsXHJcbiAgICB9LCBnZW5lcmF0b3IpKTtcclxuICB9LFxyXG4gIGNyZWF0ZUZsb2F0cyhwcm9wLCBnZW5lcmF0b3Ipe1xyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0Zsb2F0KHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcclxuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aCxcclxuICAgICAgaW5jbHVzaXZlOiB0cnVlLFxyXG4gICAgfSwgZ2VuZXJhdG9yKSk7XHJcbiAgfSxcclxuICBjcmVhdGVOb3JtYWxzKHByb3AsIGdlbmVyYXRvcil7XHJcbiAgICB2YXIgbCA9IHByb3AubGVuZ3RoO1xyXG4gICAgdmFyIHZhbHVlcyA9IFtdO1xyXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGw7IGkrKyl7XHJcbiAgICAgIHZhbHVlcy5wdXNoKFxyXG4gICAgICAgIGNyZWF0ZU5vcm1hbChwcm9wLCBnZW5lcmF0b3IpXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdmFsdWVzO1xyXG4gIH0sXHJcbiAgbXV0YXRlU2h1ZmZsZShcclxuICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxyXG4gICl7XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvU2h1ZmZsZShwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcclxuICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlXHJcbiAgICApKTtcclxuICB9LFxyXG4gIG11dGF0ZUludGVnZXJzKHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZSl7XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvSW50ZWdlcihwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcclxuICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlXHJcbiAgICApKTtcclxuICB9LFxyXG4gIG11dGF0ZUZsb2F0cyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGUpe1xyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0Zsb2F0KHByb3AsIHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxyXG4gICAgICBwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGVcclxuICAgICkpO1xyXG4gIH0sXHJcbiAgbWFwVG9TaHVmZmxlKHByb3AsIG5vcm1hbHMpe1xyXG4gICAgdmFyIG9mZnNldCA9IHByb3Aub2Zmc2V0IHx8IDA7XHJcbiAgICB2YXIgbGltaXQgPSBwcm9wLmxpbWl0IHx8IHByb3AubGVuZ3RoO1xyXG4gICAgdmFyIHNvcnRlZCA9IG5vcm1hbHMuc2xpY2UoKS5zb3J0KGZ1bmN0aW9uKGEsIGIpe1xyXG4gICAgICByZXR1cm4gYSAtIGI7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBub3JtYWxzLm1hcChmdW5jdGlvbih2YWwpe1xyXG4gICAgICByZXR1cm4gc29ydGVkLmluZGV4T2YodmFsKTtcclxuICAgIH0pLm1hcChmdW5jdGlvbihpKXtcclxuICAgICAgcmV0dXJuIGkgKyBvZmZzZXQ7XHJcbiAgICB9KS5zbGljZSgwLCBsaW1pdCk7XHJcbiAgfSxcclxuICBtYXBUb0ludGVnZXIocHJvcCwgbm9ybWFscyl7XHJcbiAgICBwcm9wID0ge1xyXG4gICAgICBtaW46IHByb3AubWluIHx8IDAsXHJcbiAgICAgIHJhbmdlOiBwcm9wLnJhbmdlIHx8IDEwLFxyXG4gICAgICBsZW5ndGg6IHByb3AubGVuZ3RoXHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvRmxvYXQocHJvcCwgbm9ybWFscykubWFwKGZ1bmN0aW9uKGZsb2F0KXtcclxuICAgICAgcmV0dXJuIE1hdGgucm91bmQoZmxvYXQpO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuICBtYXBUb0Zsb2F0KHByb3AsIG5vcm1hbHMpe1xyXG4gICAgcHJvcCA9IHtcclxuICAgICAgbWluOiBwcm9wLm1pbiB8fCAwLFxyXG4gICAgICByYW5nZTogcHJvcC5yYW5nZSB8fCAxXHJcbiAgICB9XHJcbiAgICByZXR1cm4gbm9ybWFscy5tYXAoZnVuY3Rpb24obm9ybWFsKXtcclxuICAgICAgdmFyIG1pbiA9IHByb3AubWluO1xyXG4gICAgICB2YXIgcmFuZ2UgPSBwcm9wLnJhbmdlO1xyXG4gICAgICByZXR1cm4gbWluICsgbm9ybWFsICogcmFuZ2VcclxuICAgIH0pXHJcbiAgfSxcclxuICBtdXRhdGVOb3JtYWxzKHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZSl7XHJcbiAgICB2YXIgZmFjdG9yID0gKHByb3AuZmFjdG9yIHx8IDEpICogbXV0YXRpb25fcmFuZ2VcclxuICAgIHJldHVybiBvcmlnaW5hbFZhbHVlcy5tYXAoZnVuY3Rpb24ob3JpZ2luYWxWYWx1ZSl7XHJcbiAgICAgIGlmKGdlbmVyYXRvcigpID4gY2hhbmNlVG9NdXRhdGUpe1xyXG4gICAgICAgIHJldHVybiBvcmlnaW5hbFZhbHVlO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBtdXRhdGVOb3JtYWwoXHJcbiAgICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlLCBmYWN0b3JcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gcmFuZG9tO1xyXG5cclxuZnVuY3Rpb24gbXV0YXRlTm9ybWFsKHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZSwgbXV0YXRpb25fcmFuZ2Upe1xyXG4gIGlmKG11dGF0aW9uX3JhbmdlID4gMSl7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgbXV0YXRlIGJleW9uZCBib3VuZHNcIik7XHJcbiAgfVxyXG4gIHZhciBuZXdNaW4gPSBvcmlnaW5hbFZhbHVlIC0gMC41O1xyXG4gIGlmIChuZXdNaW4gPCAwKSBuZXdNaW4gPSAwO1xyXG4gIGlmIChuZXdNaW4gKyBtdXRhdGlvbl9yYW5nZSAgPiAxKVxyXG4gICAgbmV3TWluID0gMSAtIG11dGF0aW9uX3JhbmdlO1xyXG4gIHZhciByYW5nZVZhbHVlID0gY3JlYXRlTm9ybWFsKHtcclxuICAgIGluY2x1c2l2ZTogdHJ1ZSxcclxuICB9LCBnZW5lcmF0b3IpO1xyXG4gIHJldHVybiBuZXdNaW4gKyByYW5nZVZhbHVlICogbXV0YXRpb25fcmFuZ2U7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU5vcm1hbChwcm9wLCBnZW5lcmF0b3Ipe1xyXG4gIGlmKCFwcm9wLmluY2x1c2l2ZSl7XHJcbiAgICByZXR1cm4gZ2VuZXJhdG9yKCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiBnZW5lcmF0b3IoKSA8IDAuNSA/XHJcbiAgICBnZW5lcmF0b3IoKSA6XHJcbiAgICAxIC0gZ2VuZXJhdG9yKCk7XHJcbiAgfVxyXG59XHJcbiIsIi8qIGdsb2JhbHMgYnRvYSAqL1xyXG52YXIgc2V0dXBTY2VuZSA9IHJlcXVpcmUoXCIuL3NldHVwLXNjZW5lXCIpO1xyXG52YXIgY2FyUnVuID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvcnVuXCIpO1xyXG52YXIgZGVmVG9DYXIgPSByZXF1aXJlKFwiLi4vY2FyLXNjaGVtYS9kZWYtdG8tY2FyXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBydW5EZWZzO1xyXG5mdW5jdGlvbiBydW5EZWZzKHdvcmxkX2RlZiwgZGVmcywgbGlzdGVuZXJzKSB7XHJcbiAgaWYgKHdvcmxkX2RlZi5tdXRhYmxlX2Zsb29yKSB7XHJcbiAgICAvLyBHSE9TVCBESVNBQkxFRFxyXG4gICAgd29ybGRfZGVmLmZsb29yc2VlZCA9IGJ0b2EoTWF0aC5zZWVkcmFuZG9tKCkpO1xyXG4gIH1cclxuXHJcbiAgdmFyIHNjZW5lID0gc2V0dXBTY2VuZSh3b3JsZF9kZWYpO1xyXG4gIHNjZW5lLndvcmxkLlN0ZXAoMSAvIHdvcmxkX2RlZi5ib3gyZGZwcywgMjAsIDIwKTtcclxuICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGJ1aWxkIGNhcnNcIik7XHJcbiAgdmFyIGNhcnMgPSBkZWZzLm1hcCgoZGVmLCBpKSA9PiB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBpbmRleDogaSxcclxuICAgICAgZGVmOiBkZWYsXHJcbiAgICAgIGNhcjogZGVmVG9DYXIoZGVmLCBzY2VuZS53b3JsZCwgd29ybGRfZGVmKSxcclxuICAgICAgc3RhdGU6IGNhclJ1bi5nZXRJbml0aWFsU3RhdGUod29ybGRfZGVmKVxyXG4gICAgfTtcclxuICB9KTtcclxuICB2YXIgYWxpdmVjYXJzID0gY2FycztcclxuICByZXR1cm4ge1xyXG4gICAgc2NlbmU6IHNjZW5lLFxyXG4gICAgY2FyczogY2FycyxcclxuICAgIHN0ZXA6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgaWYgKGFsaXZlY2Fycy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJubyBtb3JlIGNhcnNcIik7XHJcbiAgICAgIH1cclxuICAgICAgc2NlbmUud29ybGQuU3RlcCgxIC8gd29ybGRfZGVmLmJveDJkZnBzLCAyMCwgMjApO1xyXG4gICAgICBsaXN0ZW5lcnMucHJlQ2FyU3RlcCgpO1xyXG4gICAgICBhbGl2ZWNhcnMgPSBhbGl2ZWNhcnMuZmlsdGVyKGZ1bmN0aW9uIChjYXIpIHtcclxuICAgICAgICBjYXIuc3RhdGUgPSBjYXJSdW4udXBkYXRlU3RhdGUoXHJcbiAgICAgICAgICB3b3JsZF9kZWYsIGNhci5jYXIsIGNhci5zdGF0ZVxyXG4gICAgICAgICk7XHJcbiAgICAgICAgdmFyIHN0YXR1cyA9IGNhclJ1bi5nZXRTdGF0dXMoY2FyLnN0YXRlLCB3b3JsZF9kZWYpO1xyXG4gICAgICAgIGxpc3RlbmVycy5jYXJTdGVwKGNhcik7XHJcbiAgICAgICAgaWYgKHN0YXR1cyA9PT0gMCkge1xyXG4gICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhci5zY29yZSA9IGNhclJ1bi5jYWxjdWxhdGVTY29yZShjYXIuc3RhdGUsIHdvcmxkX2RlZik7XHJcbiAgICAgICAgbGlzdGVuZXJzLmNhckRlYXRoKGNhcik7XHJcblxyXG4gICAgICAgIHZhciB3b3JsZCA9IHNjZW5lLndvcmxkO1xyXG4gICAgICAgIHZhciB3b3JsZENhciA9IGNhci5jYXI7XHJcbiAgICAgICAgd29ybGQuRGVzdHJveUJvZHkod29ybGRDYXIuY2hhc3Npcyk7XHJcblxyXG4gICAgICAgIGZvciAodmFyIHcgPSAwOyB3IDwgd29ybGRDYXIud2hlZWxzLmxlbmd0aDsgdysrKSB7XHJcbiAgICAgICAgICB3b3JsZC5EZXN0cm95Qm9keSh3b3JsZENhci53aGVlbHNbd10pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICB9KVxyXG4gICAgICBpZiAoYWxpdmVjYXJzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIGxpc3RlbmVycy5nZW5lcmF0aW9uRW5kKGNhcnMpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxufVxyXG4iLCIvKiBnbG9iYWxzIGIyV29ybGQgYjJWZWMyIGIyQm9keURlZiBiMkZpeHR1cmVEZWYgYjJQb2x5Z29uU2hhcGUgKi9cclxuXHJcbi8qXHJcblxyXG53b3JsZF9kZWYgPSB7XHJcbiAgZ3Jhdml0eToge3gsIHl9LFxyXG4gIGRvU2xlZXA6IGJvb2xlYW4sXHJcbiAgZmxvb3JzZWVkOiBzdHJpbmcsXHJcbiAgdGlsZURpbWVuc2lvbnMsXHJcbiAgbWF4Rmxvb3JUaWxlcyxcclxuICBtdXRhYmxlX2Zsb29yOiBib29sZWFuXHJcbn1cclxuXHJcbiovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHdvcmxkX2RlZil7XHJcblxyXG4gIHZhciB3b3JsZCA9IG5ldyBiMldvcmxkKHdvcmxkX2RlZi5ncmF2aXR5LCB3b3JsZF9kZWYuZG9TbGVlcCk7XHJcbiAgdmFyIGZsb29yVGlsZXMgPSBjd19jcmVhdGVGbG9vcihcclxuICAgIHdvcmxkLFxyXG4gICAgd29ybGRfZGVmLmZsb29yc2VlZCxcclxuICAgIHdvcmxkX2RlZi50aWxlRGltZW5zaW9ucyxcclxuICAgIHdvcmxkX2RlZi5tYXhGbG9vclRpbGVzLFxyXG4gICAgd29ybGRfZGVmLm11dGFibGVfZmxvb3JcclxuICApO1xyXG5cclxuICB2YXIgbGFzdF90aWxlID0gZmxvb3JUaWxlc1tcclxuICAgIGZsb29yVGlsZXMubGVuZ3RoIC0gMVxyXG4gIF07XHJcbiAgdmFyIGxhc3RfZml4dHVyZSA9IGxhc3RfdGlsZS5HZXRGaXh0dXJlTGlzdCgpO1xyXG4gIHZhciB0aWxlX3Bvc2l0aW9uID0gbGFzdF90aWxlLkdldFdvcmxkUG9pbnQoXHJcbiAgICBsYXN0X2ZpeHR1cmUuR2V0U2hhcGUoKS5tX3ZlcnRpY2VzWzNdXHJcbiAgKTtcclxuICB3b3JsZC5maW5pc2hMaW5lID0gdGlsZV9wb3NpdGlvbi54O1xyXG4gIHJldHVybiB7XHJcbiAgICB3b3JsZDogd29ybGQsXHJcbiAgICBmbG9vclRpbGVzOiBmbG9vclRpbGVzLFxyXG4gICAgZmluaXNoTGluZTogdGlsZV9wb3NpdGlvbi54XHJcbiAgfTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfY3JlYXRlRmxvb3Iod29ybGQsIGZsb29yc2VlZCwgZGltZW5zaW9ucywgbWF4Rmxvb3JUaWxlcywgbXV0YWJsZV9mbG9vcikge1xyXG4gIHZhciBsYXN0X3RpbGUgPSBudWxsO1xyXG4gIHZhciB0aWxlX3Bvc2l0aW9uID0gbmV3IGIyVmVjMigtNSwgMCk7XHJcbiAgdmFyIGN3X2Zsb29yVGlsZXMgPSBbXTtcclxuICBNYXRoLnNlZWRyYW5kb20oZmxvb3JzZWVkKTtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IG1heEZsb29yVGlsZXM7IGsrKykge1xyXG4gICAgaWYgKCFtdXRhYmxlX2Zsb29yKSB7XHJcbiAgICAgIC8vIGtlZXAgb2xkIGltcG9zc2libGUgdHJhY2tzIGlmIG5vdCB1c2luZyBtdXRhYmxlIGZsb29yc1xyXG4gICAgICBsYXN0X3RpbGUgPSBjd19jcmVhdGVGbG9vclRpbGUoXHJcbiAgICAgICAgd29ybGQsIGRpbWVuc2lvbnMsIHRpbGVfcG9zaXRpb24sIChNYXRoLnJhbmRvbSgpICogMyAtIDEuNSkgKiAxLjUgKiBrIC8gbWF4Rmxvb3JUaWxlc1xyXG4gICAgICApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gaWYgcGF0aCBpcyBtdXRhYmxlIG92ZXIgcmFjZXMsIGNyZWF0ZSBzbW9vdGhlciB0cmFja3NcclxuICAgICAgbGFzdF90aWxlID0gY3dfY3JlYXRlRmxvb3JUaWxlKFxyXG4gICAgICAgIHdvcmxkLCBkaW1lbnNpb25zLCB0aWxlX3Bvc2l0aW9uLCAoTWF0aC5yYW5kb20oKSAqIDMgLSAxLjUpICogMS4yICogayAvIG1heEZsb29yVGlsZXNcclxuICAgICAgKTtcclxuICAgIH1cclxuICAgIGN3X2Zsb29yVGlsZXMucHVzaChsYXN0X3RpbGUpO1xyXG4gICAgdmFyIGxhc3RfZml4dHVyZSA9IGxhc3RfdGlsZS5HZXRGaXh0dXJlTGlzdCgpO1xyXG4gICAgdGlsZV9wb3NpdGlvbiA9IGxhc3RfdGlsZS5HZXRXb3JsZFBvaW50KGxhc3RfZml4dHVyZS5HZXRTaGFwZSgpLm1fdmVydGljZXNbM10pO1xyXG4gIH1cclxuICByZXR1cm4gY3dfZmxvb3JUaWxlcztcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGN3X2NyZWF0ZUZsb29yVGlsZSh3b3JsZCwgZGltLCBwb3NpdGlvbiwgYW5nbGUpIHtcclxuICB2YXIgYm9keV9kZWYgPSBuZXcgYjJCb2R5RGVmKCk7XHJcblxyXG4gIGJvZHlfZGVmLnBvc2l0aW9uLlNldChwb3NpdGlvbi54LCBwb3NpdGlvbi55KTtcclxuICB2YXIgYm9keSA9IHdvcmxkLkNyZWF0ZUJvZHkoYm9keV9kZWYpO1xyXG4gIHZhciBmaXhfZGVmID0gbmV3IGIyRml4dHVyZURlZigpO1xyXG4gIGZpeF9kZWYuc2hhcGUgPSBuZXcgYjJQb2x5Z29uU2hhcGUoKTtcclxuICBmaXhfZGVmLmZyaWN0aW9uID0gMC41O1xyXG5cclxuICB2YXIgY29vcmRzID0gbmV3IEFycmF5KCk7XHJcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMigwLCAwKSk7XHJcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMigwLCAtZGltLnkpKTtcclxuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKGRpbS54LCAtZGltLnkpKTtcclxuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKGRpbS54LCAwKSk7XHJcblxyXG4gIHZhciBjZW50ZXIgPSBuZXcgYjJWZWMyKDAsIDApO1xyXG5cclxuICB2YXIgbmV3Y29vcmRzID0gY3dfcm90YXRlRmxvb3JUaWxlKGNvb3JkcywgY2VudGVyLCBhbmdsZSk7XHJcblxyXG4gIGZpeF9kZWYuc2hhcGUuU2V0QXNBcnJheShuZXdjb29yZHMpO1xyXG5cclxuICBib2R5LkNyZWF0ZUZpeHR1cmUoZml4X2RlZik7XHJcbiAgcmV0dXJuIGJvZHk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3JvdGF0ZUZsb29yVGlsZShjb29yZHMsIGNlbnRlciwgYW5nbGUpIHtcclxuICByZXR1cm4gY29vcmRzLm1hcChmdW5jdGlvbihjb29yZCl7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB4OiBNYXRoLmNvcyhhbmdsZSkgKiAoY29vcmQueCAtIGNlbnRlci54KSAtIE1hdGguc2luKGFuZ2xlKSAqIChjb29yZC55IC0gY2VudGVyLnkpICsgY2VudGVyLngsXHJcbiAgICAgIHk6IE1hdGguc2luKGFuZ2xlKSAqIChjb29yZC54IC0gY2VudGVyLngpICsgTWF0aC5jb3MoYW5nbGUpICogKGNvb3JkLnkgLSBjZW50ZXIueSkgKyBjZW50ZXIueSxcclxuICAgIH07XHJcbiAgfSk7XHJcbn1cclxuIl19
