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
		localStorage.setItem("EA-A-"+newRounds, JSON.stringify(graphState.cw_graphAverage));
		localStorage.setItem("EA-T-"+newRounds, JSON.stringify(graphState.cw_graphTop));
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwic3JjL2Nhci1zY2hlbWEvY2FyLWNvbnN0YW50cy5qc29uIiwic3JjL2Nhci1zY2hlbWEvY29uc3RydWN0LmpzIiwic3JjL2Nhci1zY2hlbWEvZGVmLXRvLWNhci5qcyIsInNyYy9jYXItc2NoZW1hL3J1bi5qcyIsInNyYy9kcmF3L2RyYXctY2FyLXN0YXRzLmpzIiwic3JjL2RyYXcvZHJhdy1jYXIuanMiLCJzcmMvZHJhdy9kcmF3LWNpcmNsZS5qcyIsInNyYy9kcmF3L2RyYXctZmxvb3IuanMiLCJzcmMvZHJhdy9kcmF3LXZpcnR1YWwtcG9seS5qcyIsInNyYy9kcmF3L3Bsb3QtZ3JhcGhzLmpzIiwic3JjL2RyYXcvc2NhdHRlci1wbG90LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL2dlbmVyYXRlUmFuZG9tLmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL2luYnJlZWRpbmctY29lZmZpY2llbnQuanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvaW5kZXguanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvcGlja1BhcmVudC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9zZWxlY3RGcm9tQWxsUGFyZW50cy5qcyIsInNyYy9naG9zdC9jYXItdG8tZ2hvc3QuanMiLCJzcmMvZ2hvc3QvaW5kZXguanMiLCJzcmMvaW5kZXguanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9jcmVhdGUtaW5zdGFuY2UuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9jbHVzdGVyaW5nL2NsdXN0ZXIuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9jbHVzdGVyaW5nL2NsdXN0ZXJTZXR1cC5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL2Nyb3Nzb3Zlci5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL2luaXRpYWxDYXJzLmpzb24iLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9tYW5hZ2Utcm91bmQuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9tdXRhdGlvbi5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL3JhbmRvbUludC5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL3NlbGVjdGlvbi5qcyIsInNyYy9tYWNoaW5lLWxlYXJuaW5nL3JhbmRvbS5qcyIsInNyYy93b3JsZC9ydW4uanMiLCJzcmMvd29ybGQvc2V0dXAtc2NlbmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9EQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcnRCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEdBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5REE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIiLCJtb2R1bGUuZXhwb3J0cz17XG4gIFwid2hlZWxDb3VudFwiOiAyLFxuICBcIndoZWVsTWluUmFkaXVzXCI6IDAuMixcbiAgXCJ3aGVlbFJhZGl1c1JhbmdlXCI6IDAuNSxcbiAgXCJ3aGVlbE1pbkRlbnNpdHlcIjogNDAsXG4gIFwid2hlZWxEZW5zaXR5UmFuZ2VcIjogMTAwLFxuICBcImNoYXNzaXNEZW5zaXR5UmFuZ2VcIjogMzAwLFxuICBcImNoYXNzaXNNaW5EZW5zaXR5XCI6IDMwLFxuICBcImNoYXNzaXNNaW5BeGlzXCI6IDAuMSxcbiAgXCJjaGFzc2lzQXhpc1JhbmdlXCI6IDEuMVxufVxuIiwidmFyIGNhckNvbnN0YW50cyA9IHJlcXVpcmUoXCIuL2Nhci1jb25zdGFudHMuanNvblwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHdvcmxkRGVmOiB3b3JsZERlZixcbiAgY2FyQ29uc3RhbnRzOiBnZXRDYXJDb25zdGFudHMsXG4gIGdlbmVyYXRlU2NoZW1hOiBnZW5lcmF0ZVNjaGVtYVxufVxuXG5mdW5jdGlvbiB3b3JsZERlZigpe1xuICB2YXIgYm94MmRmcHMgPSA2MDtcbiAgcmV0dXJuIHtcbiAgICBncmF2aXR5OiB7IHk6IDAgfSxcbiAgICBkb1NsZWVwOiB0cnVlLFxuICAgIGZsb29yc2VlZDogXCJhYmNcIixcbiAgICBtYXhGbG9vclRpbGVzOiAyMDAsXG4gICAgbXV0YWJsZV9mbG9vcjogZmFsc2UsXG4gICAgbW90b3JTcGVlZDogMjAsXG4gICAgYm94MmRmcHM6IGJveDJkZnBzLFxuICAgIG1heF9jYXJfaGVhbHRoOiBib3gyZGZwcyAqIDEwLFxuICAgIHRpbGVEaW1lbnNpb25zOiB7XG4gICAgICB3aWR0aDogMS41LFxuICAgICAgaGVpZ2h0OiAwLjE1XG4gICAgfVxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXRDYXJDb25zdGFudHMoKXtcbiAgcmV0dXJuIGNhckNvbnN0YW50cztcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVTY2hlbWEodmFsdWVzKXtcbiAgcmV0dXJuIHtcbiAgICB3aGVlbF9yYWRpdXM6IHtcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcbiAgICAgIGxlbmd0aDogdmFsdWVzLndoZWVsQ291bnQsXG4gICAgICBtaW46IHZhbHVlcy53aGVlbE1pblJhZGl1cyxcbiAgICAgIHJhbmdlOiB2YWx1ZXMud2hlZWxSYWRpdXNSYW5nZSxcbiAgICAgIGZhY3RvcjogMSxcbiAgICB9LFxuICAgIHdoZWVsX2RlbnNpdHk6IHtcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcbiAgICAgIGxlbmd0aDogdmFsdWVzLndoZWVsQ291bnQsXG4gICAgICBtaW46IHZhbHVlcy53aGVlbE1pbkRlbnNpdHksXG4gICAgICByYW5nZTogdmFsdWVzLndoZWVsRGVuc2l0eVJhbmdlLFxuICAgICAgZmFjdG9yOiAxLFxuICAgIH0sXG4gICAgY2hhc3Npc19kZW5zaXR5OiB7XG4gICAgICB0eXBlOiBcImZsb2F0XCIsXG4gICAgICBsZW5ndGg6IDEsXG4gICAgICBtaW46IHZhbHVlcy5jaGFzc2lzRGVuc2l0eVJhbmdlLFxuICAgICAgcmFuZ2U6IHZhbHVlcy5jaGFzc2lzTWluRGVuc2l0eSxcbiAgICAgIGZhY3RvcjogMSxcbiAgICB9LFxuICAgIHZlcnRleF9saXN0OiB7XG4gICAgICB0eXBlOiBcImZsb2F0XCIsXG4gICAgICBsZW5ndGg6IDEyLFxuICAgICAgbWluOiB2YWx1ZXMuY2hhc3Npc01pbkF4aXMsXG4gICAgICByYW5nZTogdmFsdWVzLmNoYXNzaXNBeGlzUmFuZ2UsXG4gICAgICBmYWN0b3I6IDEsXG4gICAgfSxcbiAgICB3aGVlbF92ZXJ0ZXg6IHtcbiAgICAgIHR5cGU6IFwic2h1ZmZsZVwiLFxuICAgICAgbGVuZ3RoOiA4LFxuICAgICAgbGltaXQ6IHZhbHVlcy53aGVlbENvdW50LFxuICAgICAgZmFjdG9yOiAxLFxuICAgIH0sXG4gIH07XG59XG4iLCIvKlxuICBnbG9iYWxzIGIyUmV2b2x1dGVKb2ludERlZiBiMlZlYzIgYjJCb2R5RGVmIGIyQm9keSBiMkZpeHR1cmVEZWYgYjJQb2x5Z29uU2hhcGUgYjJDaXJjbGVTaGFwZVxuKi9cblxudmFyIGNyZWF0ZUluc3RhbmNlID0gcmVxdWlyZShcIi4uL21hY2hpbmUtbGVhcm5pbmcvY3JlYXRlLWluc3RhbmNlXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGRlZlRvQ2FyO1xuXG5mdW5jdGlvbiBkZWZUb0Nhcihub3JtYWxfZGVmLCB3b3JsZCwgY29uc3RhbnRzKXtcbiAgdmFyIGNhcl9kZWYgPSBjcmVhdGVJbnN0YW5jZS5hcHBseVR5cGVzKGNvbnN0YW50cy5zY2hlbWEsIG5vcm1hbF9kZWYpXG4gIHZhciBpbnN0YW5jZSA9IHt9O1xuICBpbnN0YW5jZS5jaGFzc2lzID0gY3JlYXRlQ2hhc3NpcyhcbiAgICB3b3JsZCwgY2FyX2RlZi52ZXJ0ZXhfbGlzdCwgY2FyX2RlZi5jaGFzc2lzX2RlbnNpdHlcbiAgKTtcbiAgdmFyIGk7XG5cbiAgdmFyIHdoZWVsQ291bnQgPSBjYXJfZGVmLndoZWVsX3JhZGl1cy5sZW5ndGg7XG5cbiAgaW5zdGFuY2Uud2hlZWxzID0gW107XG4gIGZvciAoaSA9IDA7IGkgPCB3aGVlbENvdW50OyBpKyspIHtcbiAgICBpbnN0YW5jZS53aGVlbHNbaV0gPSBjcmVhdGVXaGVlbChcbiAgICAgIHdvcmxkLFxuICAgICAgY2FyX2RlZi53aGVlbF9yYWRpdXNbaV0sXG4gICAgICBjYXJfZGVmLndoZWVsX2RlbnNpdHlbaV1cbiAgICApO1xuICB9XG5cbiAgdmFyIGNhcm1hc3MgPSBpbnN0YW5jZS5jaGFzc2lzLkdldE1hc3MoKTtcbiAgZm9yIChpID0gMDsgaSA8IHdoZWVsQ291bnQ7IGkrKykge1xuICAgIGNhcm1hc3MgKz0gaW5zdGFuY2Uud2hlZWxzW2ldLkdldE1hc3MoKTtcbiAgfVxuXG4gIHZhciBqb2ludF9kZWYgPSBuZXcgYjJSZXZvbHV0ZUpvaW50RGVmKCk7XG5cbiAgZm9yIChpID0gMDsgaSA8IHdoZWVsQ291bnQ7IGkrKykge1xuICAgIHZhciB0b3JxdWUgPSBjYXJtYXNzICogLWNvbnN0YW50cy5ncmF2aXR5LnkgLyBjYXJfZGVmLndoZWVsX3JhZGl1c1tpXTtcblxuICAgIHZhciByYW5kdmVydGV4ID0gaW5zdGFuY2UuY2hhc3Npcy52ZXJ0ZXhfbGlzdFtjYXJfZGVmLndoZWVsX3ZlcnRleFtpXV07XG4gICAgam9pbnRfZGVmLmxvY2FsQW5jaG9yQS5TZXQocmFuZHZlcnRleC54LCByYW5kdmVydGV4LnkpO1xuICAgIGpvaW50X2RlZi5sb2NhbEFuY2hvckIuU2V0KDAsIDApO1xuICAgIGpvaW50X2RlZi5tYXhNb3RvclRvcnF1ZSA9IHRvcnF1ZTtcbiAgICBqb2ludF9kZWYubW90b3JTcGVlZCA9IC1jb25zdGFudHMubW90b3JTcGVlZDtcbiAgICBqb2ludF9kZWYuZW5hYmxlTW90b3IgPSB0cnVlO1xuICAgIGpvaW50X2RlZi5ib2R5QSA9IGluc3RhbmNlLmNoYXNzaXM7XG4gICAgam9pbnRfZGVmLmJvZHlCID0gaW5zdGFuY2Uud2hlZWxzW2ldO1xuICAgIHdvcmxkLkNyZWF0ZUpvaW50KGpvaW50X2RlZik7XG4gIH1cblxuICByZXR1cm4gaW5zdGFuY2U7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUNoYXNzaXMod29ybGQsIHZlcnRleHMsIGRlbnNpdHkpIHtcblxuICB2YXIgdmVydGV4X2xpc3QgPSBuZXcgQXJyYXkoKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKHZlcnRleHNbMF0sIDApKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKHZlcnRleHNbMV0sIHZlcnRleHNbMl0pKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKDAsIHZlcnRleHNbM10pKTtcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKC12ZXJ0ZXhzWzRdLCB2ZXJ0ZXhzWzVdKSk7XG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigtdmVydGV4c1s2XSwgMCkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoLXZlcnRleHNbN10sIC12ZXJ0ZXhzWzhdKSk7XG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMigwLCAtdmVydGV4c1s5XSkpO1xuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1sxMF0sIC12ZXJ0ZXhzWzExXSkpO1xuXG4gIHZhciBib2R5X2RlZiA9IG5ldyBiMkJvZHlEZWYoKTtcbiAgYm9keV9kZWYudHlwZSA9IGIyQm9keS5iMl9keW5hbWljQm9keTtcbiAgYm9keV9kZWYucG9zaXRpb24uU2V0KDAuMCwgNC4wKTtcblxuICB2YXIgYm9keSA9IHdvcmxkLkNyZWF0ZUJvZHkoYm9keV9kZWYpO1xuXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzBdLCB2ZXJ0ZXhfbGlzdFsxXSwgZGVuc2l0eSk7XG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzFdLCB2ZXJ0ZXhfbGlzdFsyXSwgZGVuc2l0eSk7XG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzJdLCB2ZXJ0ZXhfbGlzdFszXSwgZGVuc2l0eSk7XG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzNdLCB2ZXJ0ZXhfbGlzdFs0XSwgZGVuc2l0eSk7XG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzRdLCB2ZXJ0ZXhfbGlzdFs1XSwgZGVuc2l0eSk7XG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzVdLCB2ZXJ0ZXhfbGlzdFs2XSwgZGVuc2l0eSk7XG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzZdLCB2ZXJ0ZXhfbGlzdFs3XSwgZGVuc2l0eSk7XG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzddLCB2ZXJ0ZXhfbGlzdFswXSwgZGVuc2l0eSk7XG5cbiAgYm9keS52ZXJ0ZXhfbGlzdCA9IHZlcnRleF9saXN0O1xuXG4gIHJldHVybiBib2R5O1xufVxuXG5cbmZ1bmN0aW9uIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleDEsIHZlcnRleDIsIGRlbnNpdHkpIHtcbiAgdmFyIHZlcnRleF9saXN0ID0gbmV3IEFycmF5KCk7XG4gIHZlcnRleF9saXN0LnB1c2godmVydGV4MSk7XG4gIHZlcnRleF9saXN0LnB1c2godmVydGV4Mik7XG4gIHZlcnRleF9saXN0LnB1c2goYjJWZWMyLk1ha2UoMCwgMCkpO1xuICB2YXIgZml4X2RlZiA9IG5ldyBiMkZpeHR1cmVEZWYoKTtcbiAgZml4X2RlZi5zaGFwZSA9IG5ldyBiMlBvbHlnb25TaGFwZSgpO1xuICBmaXhfZGVmLmRlbnNpdHkgPSBkZW5zaXR5O1xuICBmaXhfZGVmLmZyaWN0aW9uID0gMTA7XG4gIGZpeF9kZWYucmVzdGl0dXRpb24gPSAwLjI7XG4gIGZpeF9kZWYuZmlsdGVyLmdyb3VwSW5kZXggPSAtMTtcbiAgZml4X2RlZi5zaGFwZS5TZXRBc0FycmF5KHZlcnRleF9saXN0LCAzKTtcblxuICBib2R5LkNyZWF0ZUZpeHR1cmUoZml4X2RlZik7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVdoZWVsKHdvcmxkLCByYWRpdXMsIGRlbnNpdHkpIHtcbiAgdmFyIGJvZHlfZGVmID0gbmV3IGIyQm9keURlZigpO1xuICBib2R5X2RlZi50eXBlID0gYjJCb2R5LmIyX2R5bmFtaWNCb2R5O1xuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQoMCwgMCk7XG5cbiAgdmFyIGJvZHkgPSB3b3JsZC5DcmVhdGVCb2R5KGJvZHlfZGVmKTtcblxuICB2YXIgZml4X2RlZiA9IG5ldyBiMkZpeHR1cmVEZWYoKTtcbiAgZml4X2RlZi5zaGFwZSA9IG5ldyBiMkNpcmNsZVNoYXBlKHJhZGl1cyk7XG4gIGZpeF9kZWYuZGVuc2l0eSA9IGRlbnNpdHk7XG4gIGZpeF9kZWYuZnJpY3Rpb24gPSAxO1xuICBmaXhfZGVmLnJlc3RpdHV0aW9uID0gMC4yO1xuICBmaXhfZGVmLmZpbHRlci5ncm91cEluZGV4ID0gLTE7XG5cbiAgYm9keS5DcmVhdGVGaXh0dXJlKGZpeF9kZWYpO1xuICByZXR1cm4gYm9keTtcbn1cbiIsIlxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgZ2V0SW5pdGlhbFN0YXRlOiBnZXRJbml0aWFsU3RhdGUsXG4gIHVwZGF0ZVN0YXRlOiB1cGRhdGVTdGF0ZSxcbiAgZ2V0U3RhdHVzOiBnZXRTdGF0dXMsXG4gIGNhbGN1bGF0ZVNjb3JlOiBjYWxjdWxhdGVTY29yZSxcbn07XG5cbmZ1bmN0aW9uIGdldEluaXRpYWxTdGF0ZSh3b3JsZF9kZWYpe1xuICByZXR1cm4ge1xuICAgIGZyYW1lczogMCxcbiAgICBoZWFsdGg6IHdvcmxkX2RlZi5tYXhfY2FyX2hlYWx0aCxcbiAgICBtYXhQb3NpdGlvbnk6IDAsXG4gICAgbWluUG9zaXRpb255OiAwLFxuICAgIG1heFBvc2l0aW9ueDogMCxcbiAgfTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlU3RhdGUoY29uc3RhbnRzLCB3b3JsZENvbnN0cnVjdCwgc3RhdGUpe1xuICBpZihzdGF0ZS5oZWFsdGggPD0gMCl7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQWxyZWFkeSBEZWFkXCIpO1xuICB9XG4gIGlmKHN0YXRlLm1heFBvc2l0aW9ueCA+IGNvbnN0YW50cy5maW5pc2hMaW5lKXtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJhbHJlYWR5IEZpbmlzaGVkXCIpO1xuICB9XG5cbiAgLy8gY29uc29sZS5sb2coc3RhdGUpO1xuICAvLyBjaGVjayBoZWFsdGhcbiAgdmFyIHBvc2l0aW9uID0gd29ybGRDb25zdHJ1Y3QuY2hhc3Npcy5HZXRQb3NpdGlvbigpO1xuICAvLyBjaGVjayBpZiBjYXIgcmVhY2hlZCBlbmQgb2YgdGhlIHBhdGhcbiAgdmFyIG5leHRTdGF0ZSA9IHtcbiAgICBmcmFtZXM6IHN0YXRlLmZyYW1lcyArIDEsXG4gICAgbWF4UG9zaXRpb254OiBwb3NpdGlvbi54ID4gc3RhdGUubWF4UG9zaXRpb254ID8gcG9zaXRpb24ueCA6IHN0YXRlLm1heFBvc2l0aW9ueCxcbiAgICBtYXhQb3NpdGlvbnk6IHBvc2l0aW9uLnkgPiBzdGF0ZS5tYXhQb3NpdGlvbnkgPyBwb3NpdGlvbi55IDogc3RhdGUubWF4UG9zaXRpb255LFxuICAgIG1pblBvc2l0aW9ueTogcG9zaXRpb24ueSA8IHN0YXRlLm1pblBvc2l0aW9ueSA/IHBvc2l0aW9uLnkgOiBzdGF0ZS5taW5Qb3NpdGlvbnlcbiAgfTtcblxuICBpZiAocG9zaXRpb24ueCA+IGNvbnN0YW50cy5maW5pc2hMaW5lKSB7XG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcbiAgfVxuXG4gIGlmIChwb3NpdGlvbi54ID4gc3RhdGUubWF4UG9zaXRpb254ICsgMC4wMikge1xuICAgIG5leHRTdGF0ZS5oZWFsdGggPSBjb25zdGFudHMubWF4X2Nhcl9oZWFsdGg7XG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcbiAgfVxuICBuZXh0U3RhdGUuaGVhbHRoID0gc3RhdGUuaGVhbHRoIC0gMTtcbiAgaWYgKE1hdGguYWJzKHdvcmxkQ29uc3RydWN0LmNoYXNzaXMuR2V0TGluZWFyVmVsb2NpdHkoKS54KSA8IDAuMDAxKSB7XG4gICAgbmV4dFN0YXRlLmhlYWx0aCAtPSA1O1xuICB9XG4gIHJldHVybiBuZXh0U3RhdGU7XG59XG5cbmZ1bmN0aW9uIGdldFN0YXR1cyhzdGF0ZSwgY29uc3RhbnRzKXtcbiAgaWYoaGFzRmFpbGVkKHN0YXRlLCBjb25zdGFudHMpKSByZXR1cm4gLTE7XG4gIGlmKGhhc1N1Y2Nlc3Moc3RhdGUsIGNvbnN0YW50cykpIHJldHVybiAxO1xuICByZXR1cm4gMDtcbn1cblxuZnVuY3Rpb24gaGFzRmFpbGVkKHN0YXRlIC8qLCBjb25zdGFudHMgKi8pe1xuICByZXR1cm4gc3RhdGUuaGVhbHRoIDw9IDA7XG59XG5mdW5jdGlvbiBoYXNTdWNjZXNzKHN0YXRlLCBjb25zdGFudHMpe1xuICByZXR1cm4gc3RhdGUubWF4UG9zaXRpb254ID4gY29uc3RhbnRzLmZpbmlzaExpbmU7XG59XG5cbmZ1bmN0aW9uIGNhbGN1bGF0ZVNjb3JlKHN0YXRlLCBjb25zdGFudHMpe1xuICB2YXIgYXZnc3BlZWQgPSAoc3RhdGUubWF4UG9zaXRpb254IC8gc3RhdGUuZnJhbWVzKSAqIGNvbnN0YW50cy5ib3gyZGZwcztcbiAgdmFyIHBvc2l0aW9uID0gc3RhdGUubWF4UG9zaXRpb254O1xuICB2YXIgc2NvcmUgPSBwb3NpdGlvbiArIGF2Z3NwZWVkO1xuICByZXR1cm4ge1xuICAgIHY6IHNjb3JlLFxuICAgIHM6IGF2Z3NwZWVkLFxuICAgIHg6IHBvc2l0aW9uLFxuICAgIHk6IHN0YXRlLm1heFBvc2l0aW9ueSxcbiAgICB5Mjogc3RhdGUubWluUG9zaXRpb255XG4gIH1cbn1cbiIsIi8qIGdsb2JhbHMgZG9jdW1lbnQgKi9cblxudmFyIHJ1biA9IHJlcXVpcmUoXCIuLi9jYXItc2NoZW1hL3J1blwiKTtcblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLyogPT09IENhciA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xudmFyIGN3X0NhciA9IGZ1bmN0aW9uICgpIHtcbiAgdGhpcy5fX2NvbnN0cnVjdG9yLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59XG5cbmN3X0Nhci5wcm90b3R5cGUuX19jb25zdHJ1Y3RvciA9IGZ1bmN0aW9uIChjYXIpIHtcbiAgdGhpcy5jYXIgPSBjYXI7XG4gIHRoaXMuY2FyX2RlZiA9IGNhci5kZWY7XG4gIHZhciBjYXJfZGVmID0gdGhpcy5jYXJfZGVmO1xuXG4gIHRoaXMuZnJhbWVzID0gMDtcbiAgdGhpcy5hbGl2ZSA9IHRydWU7XG4gIHRoaXMuaXNfZWxpdGUgPSBjYXIuZGVmLmlzX2VsaXRlO1xuICB0aGlzLmhlYWx0aEJhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaGVhbHRoXCIgKyBjYXJfZGVmLmluZGV4KS5zdHlsZTtcbiAgdGhpcy5oZWFsdGhCYXJUZXh0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJoZWFsdGhcIiArIGNhcl9kZWYuaW5kZXgpLm5leHRTaWJsaW5nLm5leHRTaWJsaW5nO1xuICB0aGlzLmhlYWx0aEJhclRleHQuaW5uZXJIVE1MID0gY2FyX2RlZi5pbmRleDtcbiAgdGhpcy5taW5pbWFwbWFya2VyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJiYXJcIiArIGNhcl9kZWYuaW5kZXgpO1xuXG4gIGlmICh0aGlzLmlzX2VsaXRlKSB7XG4gICAgdGhpcy5oZWFsdGhCYXIuYmFja2dyb3VuZENvbG9yID0gXCIjM0Y3MkFGXCI7XG4gICAgdGhpcy5taW5pbWFwbWFya2VyLnN0eWxlLmJvcmRlckxlZnQgPSBcIjFweCBzb2xpZCAjM0Y3MkFGXCI7XG4gICAgdGhpcy5taW5pbWFwbWFya2VyLmlubmVySFRNTCA9IGNhcl9kZWYuaW5kZXg7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5oZWFsdGhCYXIuYmFja2dyb3VuZENvbG9yID0gXCIjRjdDODczXCI7XG4gICAgdGhpcy5taW5pbWFwbWFya2VyLnN0eWxlLmJvcmRlckxlZnQgPSBcIjFweCBzb2xpZCAjRjdDODczXCI7XG4gICAgdGhpcy5taW5pbWFwbWFya2VyLmlubmVySFRNTCA9IGNhcl9kZWYuaW5kZXg7XG4gIH1cblxufVxuXG5jd19DYXIucHJvdG90eXBlLmdldFBvc2l0aW9uID0gZnVuY3Rpb24gKCkge1xuICByZXR1cm4gdGhpcy5jYXIuY2FyLmNoYXNzaXMuR2V0UG9zaXRpb24oKTtcbn1cblxuY3dfQ2FyLnByb3RvdHlwZS5raWxsID0gZnVuY3Rpb24gKGN1cnJlbnRSdW5uZXIsIGNvbnN0YW50cykge1xuICB0aGlzLm1pbmltYXBtYXJrZXIuc3R5bGUuYm9yZGVyTGVmdCA9IFwiMXB4IHNvbGlkICMzRjcyQUZcIjtcbiAgdmFyIGZpbmlzaExpbmUgPSBjdXJyZW50UnVubmVyLnNjZW5lLmZpbmlzaExpbmVcbiAgdmFyIG1heF9jYXJfaGVhbHRoID0gY29uc3RhbnRzLm1heF9jYXJfaGVhbHRoO1xuICB2YXIgc3RhdHVzID0gcnVuLmdldFN0YXR1cyh0aGlzLmNhci5zdGF0ZSwge1xuICAgIGZpbmlzaExpbmU6IGZpbmlzaExpbmUsXG4gICAgbWF4X2Nhcl9oZWFsdGg6IG1heF9jYXJfaGVhbHRoLFxuICB9KVxuICBzd2l0Y2goc3RhdHVzKXtcbiAgICBjYXNlIDE6IHtcbiAgICAgIHRoaXMuaGVhbHRoQmFyLndpZHRoID0gXCIwXCI7XG4gICAgICBicmVha1xuICAgIH1cbiAgICBjYXNlIC0xOiB7XG4gICAgICB0aGlzLmhlYWx0aEJhclRleHQuaW5uZXJIVE1MID0gXCImZGFnZ2VyO1wiO1xuICAgICAgdGhpcy5oZWFsdGhCYXIud2lkdGggPSBcIjBcIjtcbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG4gIHRoaXMuYWxpdmUgPSBmYWxzZTtcblxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGN3X0NhcjtcbiIsIlxudmFyIGN3X2RyYXdWaXJ0dWFsUG9seSA9IHJlcXVpcmUoXCIuL2RyYXctdmlydHVhbC1wb2x5XCIpO1xudmFyIGN3X2RyYXdDaXJjbGUgPSByZXF1aXJlKFwiLi9kcmF3LWNpcmNsZVwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjYXJfY29uc3RhbnRzLCBteUNhciwgY2FtZXJhLCBjdHgpe1xuICB2YXIgY2FtZXJhX3ggPSBjYW1lcmEucG9zLng7XG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XG5cbiAgdmFyIHdoZWVsTWluRGVuc2l0eSA9IGNhcl9jb25zdGFudHMud2hlZWxNaW5EZW5zaXR5XG4gIHZhciB3aGVlbERlbnNpdHlSYW5nZSA9IGNhcl9jb25zdGFudHMud2hlZWxEZW5zaXR5UmFuZ2VcblxuICBpZiAoIW15Q2FyLmFsaXZlKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHZhciBteUNhclBvcyA9IG15Q2FyLmdldFBvc2l0aW9uKCk7XG5cbiAgaWYgKG15Q2FyUG9zLnggPCAoY2FtZXJhX3ggLSA1KSkge1xuICAgIC8vIHRvbyBmYXIgYmVoaW5kLCBkb24ndCBkcmF3XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY3R4LnN0cm9rZVN0eWxlID0gXCIjNDQ0XCI7XG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcblxuICB2YXIgd2hlZWxzID0gbXlDYXIuY2FyLmNhci53aGVlbHM7XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCB3aGVlbHMubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgYiA9IHdoZWVsc1tpXTtcbiAgICBmb3IgKHZhciBmID0gYi5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcbiAgICAgIHZhciBzID0gZi5HZXRTaGFwZSgpO1xuICAgICAgdmFyIGNvbG9yID0gTWF0aC5yb3VuZCgyNTUgLSAoMjU1ICogKGYubV9kZW5zaXR5IC0gd2hlZWxNaW5EZW5zaXR5KSkgLyB3aGVlbERlbnNpdHlSYW5nZSkudG9TdHJpbmcoKTtcbiAgICAgIHZhciByZ2Jjb2xvciA9IFwicmdiKFwiICsgY29sb3IgKyBcIixcIiArIGNvbG9yICsgXCIsXCIgKyBjb2xvciArIFwiKVwiO1xuICAgICAgY3dfZHJhd0NpcmNsZShjdHgsIGIsIHMubV9wLCBzLm1fcmFkaXVzLCBiLm1fc3dlZXAuYSwgcmdiY29sb3IpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChteUNhci5pc19lbGl0ZSkge1xuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwiIzNGNzJBRlwiO1xuICAgIGN0eC5maWxsU3R5bGUgPSBcIiNEQkUyRUZcIjtcbiAgfSBlbHNlIHtcbiAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiNGN0M4NzNcIjtcbiAgICBjdHguZmlsbFN0eWxlID0gXCIjRkFFQkNEXCI7XG4gIH1cbiAgY3R4LmJlZ2luUGF0aCgpO1xuXG4gIHZhciBjaGFzc2lzID0gbXlDYXIuY2FyLmNhci5jaGFzc2lzO1xuXG4gIGZvciAoZiA9IGNoYXNzaXMuR2V0Rml4dHVyZUxpc3QoKTsgZjsgZiA9IGYubV9uZXh0KSB7XG4gICAgdmFyIGNzID0gZi5HZXRTaGFwZSgpO1xuICAgIGN3X2RyYXdWaXJ0dWFsUG9seShjdHgsIGNoYXNzaXMsIGNzLm1fdmVydGljZXMsIGNzLm1fdmVydGV4Q291bnQpO1xuICB9XG4gIGN0eC5maWxsKCk7XG4gIGN0eC5zdHJva2UoKTtcbn1cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSBjd19kcmF3Q2lyY2xlO1xuXG5mdW5jdGlvbiBjd19kcmF3Q2lyY2xlKGN0eCwgYm9keSwgY2VudGVyLCByYWRpdXMsIGFuZ2xlLCBjb2xvcikge1xuICB2YXIgcCA9IGJvZHkuR2V0V29ybGRQb2ludChjZW50ZXIpO1xuICBjdHguZmlsbFN0eWxlID0gY29sb3I7XG5cbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHguYXJjKHAueCwgcC55LCByYWRpdXMsIDAsIDIgKiBNYXRoLlBJLCB0cnVlKTtcblxuICBjdHgubW92ZVRvKHAueCwgcC55KTtcbiAgY3R4LmxpbmVUbyhwLnggKyByYWRpdXMgKiBNYXRoLmNvcyhhbmdsZSksIHAueSArIHJhZGl1cyAqIE1hdGguc2luKGFuZ2xlKSk7XG5cbiAgY3R4LmZpbGwoKTtcbiAgY3R4LnN0cm9rZSgpO1xufVxuIiwidmFyIGN3X2RyYXdWaXJ0dWFsUG9seSA9IHJlcXVpcmUoXCIuL2RyYXctdmlydHVhbC1wb2x5XCIpO1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjdHgsIGNhbWVyYSwgY3dfZmxvb3JUaWxlcykge1xuICB2YXIgY2FtZXJhX3ggPSBjYW1lcmEucG9zLng7XG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiIzAwMFwiO1xuICBjdHguZmlsbFN0eWxlID0gXCIjNzc3XCI7XG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuXG4gIHZhciBrO1xuICBpZihjYW1lcmEucG9zLnggLSAxMCA+IDApe1xuICAgIGsgPSBNYXRoLmZsb29yKChjYW1lcmEucG9zLnggLSAxMCkgLyAxLjUpO1xuICB9IGVsc2Uge1xuICAgIGsgPSAwO1xuICB9XG5cbiAgLy8gY29uc29sZS5sb2coayk7XG5cbiAgb3V0ZXJfbG9vcDpcbiAgICBmb3IgKGs7IGsgPCBjd19mbG9vclRpbGVzLmxlbmd0aDsgaysrKSB7XG4gICAgICB2YXIgYiA9IGN3X2Zsb29yVGlsZXNba107XG4gICAgICBmb3IgKHZhciBmID0gYi5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcbiAgICAgICAgdmFyIHMgPSBmLkdldFNoYXBlKCk7XG4gICAgICAgIHZhciBzaGFwZVBvc2l0aW9uID0gYi5HZXRXb3JsZFBvaW50KHMubV92ZXJ0aWNlc1swXSkueDtcbiAgICAgICAgaWYgKChzaGFwZVBvc2l0aW9uID4gKGNhbWVyYV94IC0gNSkpICYmIChzaGFwZVBvc2l0aW9uIDwgKGNhbWVyYV94ICsgMTApKSkge1xuICAgICAgICAgIGN3X2RyYXdWaXJ0dWFsUG9seShjdHgsIGIsIHMubV92ZXJ0aWNlcywgcy5tX3ZlcnRleENvdW50KTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoc2hhcGVQb3NpdGlvbiA+IGNhbWVyYV94ICsgMTApIHtcbiAgICAgICAgICBicmVhayBvdXRlcl9sb29wO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICBjdHguZmlsbCgpO1xuICBjdHguc3Ryb2tlKCk7XG59XG4iLCJcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjdHgsIGJvZHksIHZ0eCwgbl92dHgpIHtcbiAgLy8gc2V0IHN0cm9rZXN0eWxlIGFuZCBmaWxsc3R5bGUgYmVmb3JlIGNhbGxcbiAgLy8gY2FsbCBiZWdpblBhdGggYmVmb3JlIGNhbGxcblxuICB2YXIgcDAgPSBib2R5LkdldFdvcmxkUG9pbnQodnR4WzBdKTtcbiAgY3R4Lm1vdmVUbyhwMC54LCBwMC55KTtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBuX3Z0eDsgaSsrKSB7XG4gICAgdmFyIHAgPSBib2R5LkdldFdvcmxkUG9pbnQodnR4W2ldKTtcbiAgICBjdHgubGluZVRvKHAueCwgcC55KTtcbiAgfVxuICBjdHgubGluZVRvKHAwLngsIHAwLnkpO1xufVxuIiwidmFyIHNjYXR0ZXJQbG90ID0gcmVxdWlyZShcIi4vc2NhdHRlci1wbG90XCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcGxvdEdyYXBoczogZnVuY3Rpb24oZ3JhcGhFbGVtLCB0b3BTY29yZXNFbGVtLCBzY2F0dGVyUGxvdEVsZW0sIGxhc3RTdGF0ZSwgc2NvcmVzLCBjb25maWcpIHtcbiAgICBsYXN0U3RhdGUgPSBsYXN0U3RhdGUgfHwge307XG4gICAgdmFyIGdlbmVyYXRpb25TaXplID0gc2NvcmVzLmxlbmd0aFxuICAgIHZhciBncmFwaGNhbnZhcyA9IGdyYXBoRWxlbTtcbiAgICB2YXIgZ3JhcGhjdHggPSBncmFwaGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gICAgdmFyIGdyYXBod2lkdGggPSA0MDA7XG4gICAgdmFyIGdyYXBoaGVpZ2h0ID0gMjUwO1xuICAgIHZhciBuZXh0U3RhdGUgPSBjd19zdG9yZUdyYXBoU2NvcmVzKFxuICAgICAgbGFzdFN0YXRlLCBzY29yZXMsIGdlbmVyYXRpb25TaXplXG4gICAgKTtcbiAgICBjb25zb2xlLmxvZyhzY29yZXMsIG5leHRTdGF0ZSk7XG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcbiAgICBjd19wbG90QXZlcmFnZShuZXh0U3RhdGUsIGdyYXBoY3R4KTtcbiAgICBjd19wbG90RWxpdGUobmV4dFN0YXRlLCBncmFwaGN0eCk7XG4gICAgY3dfcGxvdFRvcChuZXh0U3RhdGUsIGdyYXBoY3R4KTtcbiAgICBjd19saXN0VG9wU2NvcmVzKHRvcFNjb3Jlc0VsZW0sIG5leHRTdGF0ZSk7XG4gICAgbmV4dFN0YXRlLnNjYXR0ZXJHcmFwaCA9IGRyYXdBbGxSZXN1bHRzKFxuICAgICAgc2NhdHRlclBsb3RFbGVtLCBjb25maWcsIG5leHRTdGF0ZSwgbGFzdFN0YXRlLnNjYXR0ZXJHcmFwaFxuICAgICk7XG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcbiAgfSxcbiAgY2xlYXJHcmFwaGljczogZnVuY3Rpb24oZ3JhcGhFbGVtKSB7XG4gICAgdmFyIGdyYXBoY2FudmFzID0gZ3JhcGhFbGVtO1xuICAgIHZhciBncmFwaGN0eCA9IGdyYXBoY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcbiAgICB2YXIgZ3JhcGh3aWR0aCA9IDQwMDtcbiAgICB2YXIgZ3JhcGhoZWlnaHQgPSAyNTA7XG4gICAgY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KTtcbiAgfVxufTtcblxuXG5mdW5jdGlvbiBjd19zdG9yZUdyYXBoU2NvcmVzKGxhc3RTdGF0ZSwgY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSkge1xuICBjb25zb2xlLmxvZyhjd19jYXJTY29yZXMpO1xuICByZXR1cm4ge1xuICAgIGN3X3RvcFNjb3JlczogKGxhc3RTdGF0ZS5jd190b3BTY29yZXMgfHwgW10pXG4gICAgLmNvbmNhdChbY3dfY2FyU2NvcmVzWzBdLnNjb3JlXSksXG4gICAgY3dfZ3JhcGhBdmVyYWdlOiAobGFzdFN0YXRlLmN3X2dyYXBoQXZlcmFnZSB8fCBbXSkuY29uY2F0KFtcbiAgICAgIGN3X2F2ZXJhZ2UoY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSlcbiAgICBdKSxcbiAgICBjd19ncmFwaEVsaXRlOiAobGFzdFN0YXRlLmN3X2dyYXBoRWxpdGUgfHwgW10pLmNvbmNhdChbXG4gICAgICBjd19lbGl0ZWF2ZXJhZ2UoY3dfY2FyU2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSlcbiAgICBdKSxcbiAgICBjd19ncmFwaFRvcDogKGxhc3RTdGF0ZS5jd19ncmFwaFRvcCB8fCBbXSkuY29uY2F0KFtcbiAgICAgIGN3X2NhclNjb3Jlc1swXS5zY29yZS52XG4gICAgXSksXG4gICAgYWxsUmVzdWx0czogKGxhc3RTdGF0ZS5hbGxSZXN1bHRzIHx8IFtdKS5jb25jYXQoY3dfY2FyU2NvcmVzKSxcbiAgfVxufVxuXG5mdW5jdGlvbiBjd19wbG90VG9wKHN0YXRlLCBncmFwaGN0eCkge1xuICB2YXIgY3dfZ3JhcGhUb3AgPSBzdGF0ZS5jd19ncmFwaFRvcDtcbiAgdmFyIGdyYXBoc2l6ZSA9IGN3X2dyYXBoVG9wLmxlbmd0aDtcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiNDODNCM0JcIjtcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaFRvcFtrXSk7XG4gIH1cbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XG59XG5cbmZ1bmN0aW9uIGN3X3Bsb3RFbGl0ZShzdGF0ZSwgZ3JhcGhjdHgpIHtcbiAgdmFyIGN3X2dyYXBoRWxpdGUgPSBzdGF0ZS5jd19ncmFwaEVsaXRlO1xuICB2YXIgZ3JhcGhzaXplID0gY3dfZ3JhcGhFbGl0ZS5sZW5ndGg7XG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjN0JDNzREXCI7XG4gIGdyYXBoY3R4LmJlZ2luUGF0aCgpO1xuICBncmFwaGN0eC5tb3ZlVG8oMCwgMCk7XG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZ3JhcGhzaXplOyBrKyspIHtcbiAgICBncmFwaGN0eC5saW5lVG8oNDAwICogKGsgKyAxKSAvIGdyYXBoc2l6ZSwgY3dfZ3JhcGhFbGl0ZVtrXSk7XG4gIH1cbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XG59XG5cbmZ1bmN0aW9uIGN3X3Bsb3RBdmVyYWdlKHN0YXRlLCBncmFwaGN0eCkge1xuICB2YXIgY3dfZ3JhcGhBdmVyYWdlID0gc3RhdGUuY3dfZ3JhcGhBdmVyYWdlO1xuICB2YXIgZ3JhcGhzaXplID0gY3dfZ3JhcGhBdmVyYWdlLmxlbmd0aDtcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xuICAgIGdyYXBoY3R4LmxpbmVUbyg0MDAgKiAoayArIDEpIC8gZ3JhcGhzaXplLCBjd19ncmFwaEF2ZXJhZ2Vba10pO1xuICB9XG4gIGdyYXBoY3R4LnN0cm9rZSgpO1xufVxuXG5cbmZ1bmN0aW9uIGN3X2VsaXRlYXZlcmFnZShzY29yZXMsIGdlbmVyYXRpb25TaXplKSB7XG4gIHZhciBzdW0gPSAwO1xuICBmb3IgKHZhciBrID0gMDsgayA8IE1hdGguZmxvb3IoZ2VuZXJhdGlvblNpemUgLyAyKTsgaysrKSB7XG4gICAgc3VtICs9IHNjb3Jlc1trXS5zY29yZS52O1xuICB9XG4gIHJldHVybiBzdW0gLyBNYXRoLmZsb29yKGdlbmVyYXRpb25TaXplIC8gMik7XG59XG5cbmZ1bmN0aW9uIGN3X2F2ZXJhZ2Uoc2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSkge1xuICB2YXIgc3VtID0gMDtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XG4gICAgc3VtICs9IHNjb3Jlc1trXS5zY29yZS52O1xuICB9XG4gIHJldHVybiBzdW0gLyBnZW5lcmF0aW9uU2l6ZTtcbn1cblxuZnVuY3Rpb24gY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KSB7XG4gIGdyYXBoY2FudmFzLndpZHRoID0gZ3JhcGhjYW52YXMud2lkdGg7XG4gIGdyYXBoY3R4LnRyYW5zbGF0ZSgwLCBncmFwaGhlaWdodCk7XG4gIGdyYXBoY3R4LnNjYWxlKDEsIC0xKTtcbiAgZ3JhcGhjdHgubGluZVdpZHRoID0gMTtcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiMzRjcyQUZcIjtcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XG4gIGdyYXBoY3R4Lm1vdmVUbygwLCBncmFwaGhlaWdodCAvIDIpO1xuICBncmFwaGN0eC5saW5lVG8oZ3JhcGh3aWR0aCwgZ3JhcGhoZWlnaHQgLyAyKTtcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIGdyYXBoaGVpZ2h0IC8gNCk7XG4gIGdyYXBoY3R4LmxpbmVUbyhncmFwaHdpZHRoLCBncmFwaGhlaWdodCAvIDQpO1xuICBncmFwaGN0eC5tb3ZlVG8oMCwgZ3JhcGhoZWlnaHQgKiAzIC8gNCk7XG4gIGdyYXBoY3R4LmxpbmVUbyhncmFwaHdpZHRoLCBncmFwaGhlaWdodCAqIDMgLyA0KTtcbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XG59XG5cbmZ1bmN0aW9uIGN3X2xpc3RUb3BTY29yZXMoZWxlbSwgc3RhdGUpIHtcbiAgdmFyIGN3X3RvcFNjb3JlcyA9IHN0YXRlLmN3X3RvcFNjb3JlcztcbiAgdmFyIHRzID0gZWxlbTtcbiAgdHMuaW5uZXJIVE1MID0gXCI8Yj5Ub3AgU2NvcmVzOjwvYj48YnIgLz5cIjtcbiAgY3dfdG9wU2NvcmVzLnNvcnQoZnVuY3Rpb24gKGEsIGIpIHtcbiAgICBpZiAoYS52ID4gYi52KSB7XG4gICAgICByZXR1cm4gLTFcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIDFcbiAgICB9XG4gIH0pO1xuXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgTWF0aC5taW4oMTAsIGN3X3RvcFNjb3Jlcy5sZW5ndGgpOyBrKyspIHtcbiAgICB2YXIgdG9wU2NvcmUgPSBjd190b3BTY29yZXNba107XG4gICAgLy8gY29uc29sZS5sb2codG9wU2NvcmUpO1xuICAgIHZhciBuID0gXCIjXCIgKyAoayArIDEpICsgXCI6XCI7XG4gICAgdmFyIHNjb3JlID0gTWF0aC5yb3VuZCh0b3BTY29yZS52ICogMTAwKSAvIDEwMDtcbiAgICB2YXIgZGlzdGFuY2UgPSBcImQ6XCIgKyBNYXRoLnJvdW5kKHRvcFNjb3JlLnggKiAxMDApIC8gMTAwO1xuICAgIHZhciB5cmFuZ2UgPSAgXCJoOlwiICsgTWF0aC5yb3VuZCh0b3BTY29yZS55MiAqIDEwMCkgLyAxMDAgKyBcIi9cIiArIE1hdGgucm91bmQodG9wU2NvcmUueSAqIDEwMCkgLyAxMDAgKyBcIm1cIjtcbiAgICB2YXIgZ2VuID0gXCIoR2VuIFwiICsgY3dfdG9wU2NvcmVzW2tdLmkgKyBcIilcIlxuXG4gICAgdHMuaW5uZXJIVE1MICs9ICBbbiwgc2NvcmUsIGRpc3RhbmNlLCB5cmFuZ2UsIGdlbl0uam9pbihcIiBcIikgKyBcIjxiciAvPlwiO1xuICB9XG59XG5cbmZ1bmN0aW9uIGRyYXdBbGxSZXN1bHRzKHNjYXR0ZXJQbG90RWxlbSwgY29uZmlnLCBhbGxSZXN1bHRzLCBwcmV2aW91c0dyYXBoKXtcbiAgaWYoIXNjYXR0ZXJQbG90RWxlbSkgcmV0dXJuO1xuICByZXR1cm4gc2NhdHRlclBsb3Qoc2NhdHRlclBsb3RFbGVtLCBhbGxSZXN1bHRzLCBjb25maWcucHJvcGVydHlNYXAsIHByZXZpb3VzR3JhcGgpXG59XG4iLCIvKiBnbG9iYWxzIHZpcyBIaWdoY2hhcnRzICovXG5cbi8vIENhbGxlZCB3aGVuIHRoZSBWaXN1YWxpemF0aW9uIEFQSSBpcyBsb2FkZWQuXG5cbm1vZHVsZS5leHBvcnRzID0gaGlnaENoYXJ0cztcbmZ1bmN0aW9uIGhpZ2hDaGFydHMoZWxlbSwgc2NvcmVzKXtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhzY29yZXNbMF0uZGVmKTtcbiAga2V5cyA9IGtleXMucmVkdWNlKGZ1bmN0aW9uKGN1ckFycmF5LCBrZXkpe1xuICAgIHZhciBsID0gc2NvcmVzWzBdLmRlZltrZXldLmxlbmd0aDtcbiAgICB2YXIgc3ViQXJyYXkgPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbDsgaSsrKXtcbiAgICAgIHN1YkFycmF5LnB1c2goa2V5ICsgXCIuXCIgKyBpKTtcbiAgICB9XG4gICAgcmV0dXJuIGN1ckFycmF5LmNvbmNhdChzdWJBcnJheSk7XG4gIH0sIFtdKTtcbiAgZnVuY3Rpb24gcmV0cmlldmVWYWx1ZShvYmosIHBhdGgpe1xuICAgIHJldHVybiBwYXRoLnNwbGl0KFwiLlwiKS5yZWR1Y2UoZnVuY3Rpb24oY3VyVmFsdWUsIGtleSl7XG4gICAgICByZXR1cm4gY3VyVmFsdWVba2V5XTtcbiAgICB9LCBvYmopO1xuICB9XG5cbiAgdmFyIGRhdGFPYmogPSBPYmplY3Qua2V5cyhzY29yZXMpLnJlZHVjZShmdW5jdGlvbihrdiwgc2NvcmUpe1xuICAgIGtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpe1xuICAgICAga3Zba2V5XS5kYXRhLnB1c2goW1xuICAgICAgICByZXRyaWV2ZVZhbHVlKHNjb3JlLmRlZiwga2V5KSwgc2NvcmUuc2NvcmUudlxuICAgICAgXSlcbiAgICB9KVxuICAgIHJldHVybiBrdjtcbiAgfSwga2V5cy5yZWR1Y2UoZnVuY3Rpb24oa3YsIGtleSl7XG4gICAga3Zba2V5XSA9IHtcbiAgICAgIG5hbWU6IGtleSxcbiAgICAgIGRhdGE6IFtdLFxuICAgIH1cbiAgICByZXR1cm4ga3Y7XG4gIH0sIHt9KSlcbiAgSGlnaGNoYXJ0cy5jaGFydChlbGVtLmlkLCB7XG4gICAgICBjaGFydDoge1xuICAgICAgICAgIHR5cGU6ICdzY2F0dGVyJyxcbiAgICAgICAgICB6b29tVHlwZTogJ3h5J1xuICAgICAgfSxcbiAgICAgIHRpdGxlOiB7XG4gICAgICAgICAgdGV4dDogJ1Byb3BlcnR5IFZhbHVlIHRvIFNjb3JlJ1xuICAgICAgfSxcbiAgICAgIHhBeGlzOiB7XG4gICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgdGV4dDogJ05vcm1hbGl6ZWQnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzdGFydE9uVGljazogdHJ1ZSxcbiAgICAgICAgICBlbmRPblRpY2s6IHRydWUsXG4gICAgICAgICAgc2hvd0xhc3RMYWJlbDogdHJ1ZVxuICAgICAgfSxcbiAgICAgIHlBeGlzOiB7XG4gICAgICAgICAgdGl0bGU6IHtcbiAgICAgICAgICAgICAgdGV4dDogJ1Njb3JlJ1xuICAgICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBsZWdlbmQ6IHtcbiAgICAgICAgICBsYXlvdXQ6ICd2ZXJ0aWNhbCcsXG4gICAgICAgICAgYWxpZ246ICdsZWZ0JyxcbiAgICAgICAgICB2ZXJ0aWNhbEFsaWduOiAndG9wJyxcbiAgICAgICAgICB4OiAxMDAsXG4gICAgICAgICAgeTogNzAsXG4gICAgICAgICAgZmxvYXRpbmc6IHRydWUsXG4gICAgICAgICAgYmFja2dyb3VuZENvbG9yOiAoSGlnaGNoYXJ0cy50aGVtZSAmJiBIaWdoY2hhcnRzLnRoZW1lLmxlZ2VuZEJhY2tncm91bmRDb2xvcikgfHwgJyNGRkZGRkYnLFxuICAgICAgICAgIGJvcmRlcldpZHRoOiAxXG4gICAgICB9LFxuICAgICAgcGxvdE9wdGlvbnM6IHtcbiAgICAgICAgICBzY2F0dGVyOiB7XG4gICAgICAgICAgICAgIG1hcmtlcjoge1xuICAgICAgICAgICAgICAgICAgcmFkaXVzOiA1LFxuICAgICAgICAgICAgICAgICAgc3RhdGVzOiB7XG4gICAgICAgICAgICAgICAgICAgICAgaG92ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgbGluZUNvbG9yOiAncmdiKDEwMCwxMDAsMTAwKSdcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHN0YXRlczoge1xuICAgICAgICAgICAgICAgICAgaG92ZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICBtYXJrZXI6IHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIHRvb2x0aXA6IHtcbiAgICAgICAgICAgICAgICAgIGhlYWRlckZvcm1hdDogJzxiPntzZXJpZXMubmFtZX08L2I+PGJyPicsXG4gICAgICAgICAgICAgICAgICBwb2ludEZvcm1hdDogJ3twb2ludC54fSwge3BvaW50Lnl9J1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIHNlcmllczoga2V5cy5tYXAoZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgcmV0dXJuIGRhdGFPYmpba2V5XTtcbiAgICAgIH0pXG4gIH0pO1xufVxuXG5mdW5jdGlvbiB2aXNDaGFydChlbGVtLCBzY29yZXMsIHByb3BlcnR5TWFwLCBncmFwaCkge1xuXG4gIC8vIENyZWF0ZSBhbmQgcG9wdWxhdGUgYSBkYXRhIHRhYmxlLlxuICB2YXIgZGF0YSA9IG5ldyB2aXMuRGF0YVNldCgpO1xuICBzY29yZXMuZm9yRWFjaChmdW5jdGlvbihzY29yZUluZm8pe1xuICAgIGRhdGEuYWRkKHtcbiAgICAgIHg6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueCksXG4gICAgICB5OiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLngpLFxuICAgICAgejogZ2V0UHJvcGVydHkoc2NvcmVJbmZvLCBwcm9wZXJ0eU1hcC56KSxcbiAgICAgIHN0eWxlOiBnZXRQcm9wZXJ0eShzY29yZUluZm8sIHByb3BlcnR5TWFwLnopLFxuICAgICAgLy8gZXh0cmE6IGRlZi5hbmNlc3RyeVxuICAgIH0pO1xuICB9KTtcblxuICBmdW5jdGlvbiBnZXRQcm9wZXJ0eShpbmZvLCBrZXkpe1xuICAgIGlmKGtleSA9PT0gXCJzY29yZVwiKXtcbiAgICAgIHJldHVybiBpbmZvLnNjb3JlLnZcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIGluZm8uZGVmW2tleV07XG4gICAgfVxuICB9XG5cbiAgLy8gc3BlY2lmeSBvcHRpb25zXG4gIHZhciBvcHRpb25zID0ge1xuICAgIHdpZHRoOiAgJzYwMHB4JyxcbiAgICBoZWlnaHQ6ICc2MDBweCcsXG4gICAgc3R5bGU6ICdkb3Qtc2l6ZScsXG4gICAgc2hvd1BlcnNwZWN0aXZlOiB0cnVlLFxuICAgIHNob3dMZWdlbmQ6IHRydWUsXG4gICAgc2hvd0dyaWQ6IHRydWUsXG4gICAgc2hvd1NoYWRvdzogZmFsc2UsXG5cbiAgICAvLyBPcHRpb24gdG9vbHRpcCBjYW4gYmUgdHJ1ZSwgZmFsc2UsIG9yIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGEgc3RyaW5nIHdpdGggSFRNTCBjb250ZW50c1xuICAgIHRvb2x0aXA6IGZ1bmN0aW9uIChwb2ludCkge1xuICAgICAgLy8gcGFyYW1ldGVyIHBvaW50IGNvbnRhaW5zIHByb3BlcnRpZXMgeCwgeSwgeiwgYW5kIGRhdGFcbiAgICAgIC8vIGRhdGEgaXMgdGhlIG9yaWdpbmFsIG9iamVjdCBwYXNzZWQgdG8gdGhlIHBvaW50IGNvbnN0cnVjdG9yXG4gICAgICByZXR1cm4gJ3Njb3JlOiA8Yj4nICsgcG9pbnQueiArICc8L2I+PGJyPic7IC8vICsgcG9pbnQuZGF0YS5leHRyYTtcbiAgICB9LFxuXG4gICAgLy8gVG9vbHRpcCBkZWZhdWx0IHN0eWxpbmcgY2FuIGJlIG92ZXJyaWRkZW5cbiAgICB0b29sdGlwU3R5bGU6IHtcbiAgICAgIGNvbnRlbnQ6IHtcbiAgICAgICAgYmFja2dyb3VuZCAgICA6ICdyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuNyknLFxuICAgICAgICBwYWRkaW5nICAgICAgIDogJzEwcHgnLFxuICAgICAgICBib3JkZXJSYWRpdXMgIDogJzEwcHgnXG4gICAgICB9LFxuICAgICAgbGluZToge1xuICAgICAgICBib3JkZXJMZWZ0ICAgIDogJzFweCBkb3R0ZWQgcmdiYSgwLCAwLCAwLCAwLjUpJ1xuICAgICAgfSxcbiAgICAgIGRvdDoge1xuICAgICAgICBib3JkZXIgICAgICAgIDogJzVweCBzb2xpZCByZ2JhKDAsIDAsIDAsIDAuNSknXG4gICAgICB9XG4gICAgfSxcblxuICAgIGtlZXBBc3BlY3RSYXRpbzogdHJ1ZSxcbiAgICB2ZXJ0aWNhbFJhdGlvOiAwLjVcbiAgfTtcblxuICB2YXIgY2FtZXJhID0gZ3JhcGggPyBncmFwaC5nZXRDYW1lcmFQb3NpdGlvbigpIDogbnVsbDtcblxuICAvLyBjcmVhdGUgb3VyIGdyYXBoXG4gIHZhciBjb250YWluZXIgPSBlbGVtO1xuICBncmFwaCA9IG5ldyB2aXMuR3JhcGgzZChjb250YWluZXIsIGRhdGEsIG9wdGlvbnMpO1xuXG4gIGlmIChjYW1lcmEpIGdyYXBoLnNldENhbWVyYVBvc2l0aW9uKGNhbWVyYSk7IC8vIHJlc3RvcmUgY2FtZXJhIHBvc2l0aW9uXG4gIHJldHVybiBncmFwaDtcbn1cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSBnZW5lcmF0ZVJhbmRvbTtcbmZ1bmN0aW9uIGdlbmVyYXRlUmFuZG9tKCl7XG4gIHJldHVybiBNYXRoLnJhbmRvbSgpO1xufVxuIiwiLy8gaHR0cDovL3N1bm1pbmd0YW8uYmxvZ3Nwb3QuY29tLzIwMTYvMTEvaW5icmVlZGluZy1jb2VmZmljaWVudC5odG1sXG5tb2R1bGUuZXhwb3J0cyA9IGdldEluYnJlZWRpbmdDb2VmZmljaWVudDtcblxuZnVuY3Rpb24gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50KGNoaWxkKXtcbiAgdmFyIG5hbWVJbmRleCA9IG5ldyBNYXAoKTtcbiAgdmFyIGZsYWdnZWQgPSBuZXcgU2V0KCk7XG4gIHZhciBjb252ZXJnZW5jZVBvaW50cyA9IG5ldyBTZXQoKTtcbiAgY3JlYXRlQW5jZXN0cnlNYXAoY2hpbGQsIFtdKTtcblxuICB2YXIgc3RvcmVkQ29lZmZpY2llbnRzID0gbmV3IE1hcCgpO1xuXG4gIHJldHVybiBBcnJheS5mcm9tKGNvbnZlcmdlbmNlUG9pbnRzLnZhbHVlcygpKS5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBwb2ludCl7XG4gICAgdmFyIGlDbyA9IGdldENvZWZmaWNpZW50KHBvaW50KTtcbiAgICByZXR1cm4gc3VtICsgaUNvO1xuICB9LCAwKTtcblxuICBmdW5jdGlvbiBjcmVhdGVBbmNlc3RyeU1hcChpbml0Tm9kZSl7XG4gICAgdmFyIGl0ZW1zSW5RdWV1ZSA9IFt7IG5vZGU6IGluaXROb2RlLCBwYXRoOiBbXSB9XTtcbiAgICBkb3tcbiAgICAgIHZhciBpdGVtID0gaXRlbXNJblF1ZXVlLnNoaWZ0KCk7XG4gICAgICB2YXIgbm9kZSA9IGl0ZW0ubm9kZTtcbiAgICAgIHZhciBwYXRoID0gaXRlbS5wYXRoO1xuICAgICAgaWYocHJvY2Vzc0l0ZW0obm9kZSwgcGF0aCkpe1xuICAgICAgICB2YXIgbmV4dFBhdGggPSBbIG5vZGUuaWQgXS5jb25jYXQocGF0aCk7XG4gICAgICAgIGl0ZW1zSW5RdWV1ZSA9IGl0ZW1zSW5RdWV1ZS5jb25jYXQobm9kZS5hbmNlc3RyeS5tYXAoZnVuY3Rpb24ocGFyZW50KXtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbm9kZTogcGFyZW50LFxuICAgICAgICAgICAgcGF0aDogbmV4dFBhdGhcbiAgICAgICAgICB9O1xuICAgICAgICB9KSk7XG4gICAgICB9XG4gICAgfXdoaWxlKGl0ZW1zSW5RdWV1ZS5sZW5ndGgpO1xuXG5cbiAgICBmdW5jdGlvbiBwcm9jZXNzSXRlbShub2RlLCBwYXRoKXtcbiAgICAgIHZhciBuZXdBbmNlc3RvciA9ICFuYW1lSW5kZXguaGFzKG5vZGUuaWQpO1xuICAgICAgaWYobmV3QW5jZXN0b3Ipe1xuICAgICAgICBuYW1lSW5kZXguc2V0KG5vZGUuaWQsIHtcbiAgICAgICAgICBwYXJlbnRzOiAobm9kZS5hbmNlc3RyeSB8fCBbXSkubWFwKGZ1bmN0aW9uKHBhcmVudCl7XG4gICAgICAgICAgICByZXR1cm4gcGFyZW50LmlkO1xuICAgICAgICAgIH0pLFxuICAgICAgICAgIGlkOiBub2RlLmlkLFxuICAgICAgICAgIGNoaWxkcmVuOiBbXSxcbiAgICAgICAgICBjb252ZXJnZW5jZXM6IFtdLFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgZmxhZ2dlZC5hZGQobm9kZS5pZClcbiAgICAgICAgbmFtZUluZGV4LmdldChub2RlLmlkKS5jaGlsZHJlbi5mb3JFYWNoKGZ1bmN0aW9uKGNoaWxkSWRlbnRpZmllcil7XG4gICAgICAgICAgdmFyIG9mZnNldHMgPSBmaW5kQ29udmVyZ2VuY2UoY2hpbGRJZGVudGlmaWVyLnBhdGgsIHBhdGgpO1xuICAgICAgICAgIGlmKCFvZmZzZXRzKXtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICB9XG4gICAgICAgICAgdmFyIGNoaWxkSUQgPSBwYXRoW29mZnNldHNbMV1dO1xuICAgICAgICAgIGNvbnZlcmdlbmNlUG9pbnRzLmFkZChjaGlsZElEKTtcbiAgICAgICAgICBuYW1lSW5kZXguZ2V0KGNoaWxkSUQpLmNvbnZlcmdlbmNlcy5wdXNoKHtcbiAgICAgICAgICAgIHBhcmVudDogbm9kZS5pZCxcbiAgICAgICAgICAgIG9mZnNldHM6IG9mZnNldHMsXG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuXG4gICAgICBpZihwYXRoLmxlbmd0aCl7XG4gICAgICAgIG5hbWVJbmRleC5nZXQobm9kZS5pZCkuY2hpbGRyZW4ucHVzaCh7XG4gICAgICAgICAgY2hpbGQ6IHBhdGhbMF0sXG4gICAgICAgICAgcGF0aDogcGF0aFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgaWYoIW5ld0FuY2VzdG9yKXtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYoIW5vZGUuYW5jZXN0cnkpe1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZXRDb2VmZmljaWVudChpZCl7XG4gICAgaWYoc3RvcmVkQ29lZmZpY2llbnRzLmhhcyhpZCkpe1xuICAgICAgcmV0dXJuIHN0b3JlZENvZWZmaWNpZW50cy5nZXQoaWQpO1xuICAgIH1cbiAgICB2YXIgbm9kZSA9IG5hbWVJbmRleC5nZXQoaWQpO1xuICAgIHZhciB2YWwgPSBub2RlLmNvbnZlcmdlbmNlcy5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBwb2ludCl7XG4gICAgICByZXR1cm4gc3VtICsgTWF0aC5wb3coMSAvIDIsIHBvaW50Lm9mZnNldHMucmVkdWNlKGZ1bmN0aW9uKHN1bSwgdmFsdWUpe1xuICAgICAgICByZXR1cm4gc3VtICsgdmFsdWU7XG4gICAgICB9LCAxKSkgKiAoMSArIGdldENvZWZmaWNpZW50KHBvaW50LnBhcmVudCkpO1xuICAgIH0sIDApO1xuICAgIHN0b3JlZENvZWZmaWNpZW50cy5zZXQoaWQsIHZhbCk7XG5cbiAgICByZXR1cm4gdmFsO1xuXG4gIH1cbiAgZnVuY3Rpb24gZmluZENvbnZlcmdlbmNlKGxpc3RBLCBsaXN0Qil7XG4gICAgdmFyIGNpLCBjaiwgbGksIGxqO1xuICAgIG91dGVybG9vcDpcbiAgICBmb3IoY2kgPSAwLCBsaSA9IGxpc3RBLmxlbmd0aDsgY2kgPCBsaTsgY2krKyl7XG4gICAgICBmb3IoY2ogPSAwLCBsaiA9IGxpc3RCLmxlbmd0aDsgY2ogPCBsajsgY2orKyl7XG4gICAgICAgIGlmKGxpc3RBW2NpXSA9PT0gbGlzdEJbY2pdKXtcbiAgICAgICAgICBicmVhayBvdXRlcmxvb3A7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYoY2kgPT09IGxpKXtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIFtjaSwgY2pdO1xuICB9XG59XG4iLCJ2YXIgY2FyQ29uc3RydWN0ID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvY29uc3RydWN0LmpzXCIpO1xyXG5cclxudmFyIGNhckNvbnN0YW50cyA9IGNhckNvbnN0cnVjdC5jYXJDb25zdGFudHMoKTtcclxuXHJcbnZhciBzY2hlbWEgPSBjYXJDb25zdHJ1Y3QuZ2VuZXJhdGVTY2hlbWEoY2FyQ29uc3RhbnRzKTtcclxudmFyIHBpY2tQYXJlbnQgPSByZXF1aXJlKFwiLi9waWNrUGFyZW50XCIpO1xyXG52YXIgc2VsZWN0RnJvbUFsbFBhcmVudHMgPSByZXF1aXJlKFwiLi9zZWxlY3RGcm9tQWxsUGFyZW50c1wiKTtcclxuY29uc3QgY29uc3RhbnRzID0ge1xyXG4gIGdlbmVyYXRpb25TaXplOiAyMCxcclxuICBzY2hlbWE6IHNjaGVtYSxcclxuICBjaGFtcGlvbkxlbmd0aDogMSxcclxuICBtdXRhdGlvbl9yYW5nZTogMSxcclxuICBnZW5fbXV0YXRpb246IDAuMDUsXHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKXtcclxuICB2YXIgY3VycmVudENob2ljZXMgPSBuZXcgTWFwKCk7XHJcbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24oXHJcbiAgICB7fSxcclxuICAgIGNvbnN0YW50cyxcclxuICAgIHtcclxuICAgICAgc2VsZWN0RnJvbUFsbFBhcmVudHM6IHNlbGVjdEZyb21BbGxQYXJlbnRzLFxyXG4gICAgICBnZW5lcmF0ZVJhbmRvbTogcmVxdWlyZShcIi4vZ2VuZXJhdGVSYW5kb21cIiksXHJcbiAgICAgIHBpY2tQYXJlbnQ6IHBpY2tQYXJlbnQuYmluZCh2b2lkIDAsIGN1cnJlbnRDaG9pY2VzKSxcclxuICAgIH1cclxuICApO1xyXG59XHJcbm1vZHVsZS5leHBvcnRzLmNvbnN0YW50cyA9IGNvbnN0YW50c1xyXG4iLCJ2YXIgbkF0dHJpYnV0ZXMgPSAxNTtcbm1vZHVsZS5leHBvcnRzID0gcGlja1BhcmVudDtcblxuZnVuY3Rpb24gcGlja1BhcmVudChjdXJyZW50Q2hvaWNlcywgY2hvb3NlSWQsIGtleSAvKiAsIHBhcmVudHMgKi8pe1xuICBpZighY3VycmVudENob2ljZXMuaGFzKGNob29zZUlkKSl7XG4gICAgY3VycmVudENob2ljZXMuc2V0KGNob29zZUlkLCBpbml0aWFsaXplUGljaygpKVxuICB9XG4gIC8vIGNvbnNvbGUubG9nKGNob29zZUlkKTtcbiAgdmFyIHN0YXRlID0gY3VycmVudENob2ljZXMuZ2V0KGNob29zZUlkKTtcbiAgLy8gY29uc29sZS5sb2coc3RhdGUuY3VycGFyZW50KTtcbiAgc3RhdGUuaSsrXG4gIGlmKFtcIndoZWVsX3JhZGl1c1wiLCBcIndoZWVsX3ZlcnRleFwiLCBcIndoZWVsX2RlbnNpdHlcIl0uaW5kZXhPZihrZXkpID4gLTEpe1xuICAgIHN0YXRlLmN1cnBhcmVudCA9IGN3X2Nob29zZVBhcmVudChzdGF0ZSk7XG4gICAgcmV0dXJuIHN0YXRlLmN1cnBhcmVudDtcbiAgfVxuICBzdGF0ZS5jdXJwYXJlbnQgPSBjd19jaG9vc2VQYXJlbnQoc3RhdGUpO1xuICByZXR1cm4gc3RhdGUuY3VycGFyZW50O1xuXG4gIGZ1bmN0aW9uIGN3X2Nob29zZVBhcmVudChzdGF0ZSkge1xuICAgIHZhciBjdXJwYXJlbnQgPSBzdGF0ZS5jdXJwYXJlbnQ7XG4gICAgdmFyIGF0dHJpYnV0ZUluZGV4ID0gc3RhdGUuaTtcbiAgICB2YXIgc3dhcFBvaW50MSA9IHN0YXRlLnN3YXBQb2ludDFcbiAgICB2YXIgc3dhcFBvaW50MiA9IHN0YXRlLnN3YXBQb2ludDJcbiAgICAvLyBjb25zb2xlLmxvZyhzd2FwUG9pbnQxLCBzd2FwUG9pbnQyLCBhdHRyaWJ1dGVJbmRleClcbiAgICBpZiAoKHN3YXBQb2ludDEgPT0gYXR0cmlidXRlSW5kZXgpIHx8IChzd2FwUG9pbnQyID09IGF0dHJpYnV0ZUluZGV4KSkge1xuICAgICAgcmV0dXJuIGN1cnBhcmVudCA9PSAxID8gMCA6IDFcbiAgICB9XG4gICAgcmV0dXJuIGN1cnBhcmVudFxuICB9XG5cbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZVBpY2soKXtcbiAgICB2YXIgY3VycGFyZW50ID0gMDtcblxuICAgIHZhciBzd2FwUG9pbnQxID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG5BdHRyaWJ1dGVzKSk7XG4gICAgdmFyIHN3YXBQb2ludDIgPSBzd2FwUG9pbnQxO1xuICAgIHdoaWxlIChzd2FwUG9pbnQyID09IHN3YXBQb2ludDEpIHtcbiAgICAgIHN3YXBQb2ludDIgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobkF0dHJpYnV0ZXMpKTtcbiAgICB9XG4gICAgdmFyIGkgPSAwO1xuICAgIHJldHVybiB7XG4gICAgICBjdXJwYXJlbnQ6IGN1cnBhcmVudCxcbiAgICAgIGk6IGksXG4gICAgICBzd2FwUG9pbnQxOiBzd2FwUG9pbnQxLFxuICAgICAgc3dhcFBvaW50Mjogc3dhcFBvaW50MlxuICAgIH1cbiAgfVxufVxuIiwidmFyIGdldEluYnJlZWRpbmdDb2VmZmljaWVudCA9IHJlcXVpcmUoXCIuL2luYnJlZWRpbmctY29lZmZpY2llbnRcIik7XG5cbm1vZHVsZS5leHBvcnRzID0gc2ltcGxlU2VsZWN0O1xuXG5mdW5jdGlvbiBzaW1wbGVTZWxlY3QocGFyZW50cyl7XG4gIHZhciB0b3RhbFBhcmVudHMgPSBwYXJlbnRzLmxlbmd0aFxuICB2YXIgciA9IE1hdGgucmFuZG9tKCk7XG4gIGlmIChyID09IDApXG4gICAgcmV0dXJuIDA7XG4gIHJldHVybiBNYXRoLmZsb29yKC1NYXRoLmxvZyhyKSAqIHRvdGFsUGFyZW50cykgJSB0b3RhbFBhcmVudHM7XG59XG5cbmZ1bmN0aW9uIHNlbGVjdEZyb21BbGxQYXJlbnRzKHBhcmVudHMsIHBhcmVudExpc3QsIHByZXZpb3VzUGFyZW50SW5kZXgpIHtcbiAgdmFyIHByZXZpb3VzUGFyZW50ID0gcGFyZW50c1twcmV2aW91c1BhcmVudEluZGV4XTtcbiAgdmFyIHZhbGlkUGFyZW50cyA9IHBhcmVudHMuZmlsdGVyKGZ1bmN0aW9uKHBhcmVudCwgaSl7XG4gICAgaWYocHJldmlvdXNQYXJlbnRJbmRleCA9PT0gaSl7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmKCFwcmV2aW91c1BhcmVudCl7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgdmFyIGNoaWxkID0ge1xuICAgICAgaWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpLFxuICAgICAgYW5jZXN0cnk6IFtwcmV2aW91c1BhcmVudCwgcGFyZW50XS5tYXAoZnVuY3Rpb24ocCl7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgaWQ6IHAuZGVmLmlkLFxuICAgICAgICAgIGFuY2VzdHJ5OiBwLmRlZi5hbmNlc3RyeVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgICB2YXIgaUNvID0gZ2V0SW5icmVlZGluZ0NvZWZmaWNpZW50KGNoaWxkKTtcbiAgICBjb25zb2xlLmxvZyhcImluYnJlZWRpbmcgY29lZmZpY2llbnRcIiwgaUNvKVxuICAgIGlmKGlDbyA+IDAuMjUpe1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSlcbiAgaWYodmFsaWRQYXJlbnRzLmxlbmd0aCA9PT0gMCl7XG4gICAgcmV0dXJuIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHBhcmVudHMubGVuZ3RoKVxuICB9XG4gIHZhciB0b3RhbFNjb3JlID0gdmFsaWRQYXJlbnRzLnJlZHVjZShmdW5jdGlvbihzdW0sIHBhcmVudCl7XG4gICAgcmV0dXJuIHN1bSArIHBhcmVudC5zY29yZS52O1xuICB9LCAwKTtcbiAgdmFyIHIgPSB0b3RhbFNjb3JlICogTWF0aC5yYW5kb20oKTtcbiAgZm9yKHZhciBpID0gMDsgaSA8IHZhbGlkUGFyZW50cy5sZW5ndGg7IGkrKyl7XG4gICAgdmFyIHNjb3JlID0gdmFsaWRQYXJlbnRzW2ldLnNjb3JlLnY7XG4gICAgaWYociA+IHNjb3JlKXtcbiAgICAgIHIgPSByIC0gc2NvcmU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gaTtcbn1cbiIsIlxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjYXIpIHtcbiAgdmFyIG91dCA9IHtcbiAgICBjaGFzc2lzOiBnaG9zdF9nZXRfY2hhc3NpcyhjYXIuY2hhc3NpcyksXG4gICAgd2hlZWxzOiBbXSxcbiAgICBwb3M6IHt4OiBjYXIuY2hhc3Npcy5HZXRQb3NpdGlvbigpLngsIHk6IGNhci5jaGFzc2lzLkdldFBvc2l0aW9uKCkueX1cbiAgfTtcblxuICBmb3IgKHZhciBpID0gMDsgaSA8IGNhci53aGVlbHMubGVuZ3RoOyBpKyspIHtcbiAgICBvdXQud2hlZWxzW2ldID0gZ2hvc3RfZ2V0X3doZWVsKGNhci53aGVlbHNbaV0pO1xuICB9XG5cbiAgcmV0dXJuIG91dDtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfZ2V0X2NoYXNzaXMoYykge1xuICB2YXIgZ2MgPSBbXTtcblxuICBmb3IgKHZhciBmID0gYy5HZXRGaXh0dXJlTGlzdCgpOyBmOyBmID0gZi5tX25leHQpIHtcbiAgICB2YXIgcyA9IGYuR2V0U2hhcGUoKTtcblxuICAgIHZhciBwID0ge1xuICAgICAgdnR4OiBbXSxcbiAgICAgIG51bTogMFxuICAgIH1cblxuICAgIHAubnVtID0gcy5tX3ZlcnRleENvdW50O1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzLm1fdmVydGV4Q291bnQ7IGkrKykge1xuICAgICAgcC52dHgucHVzaChjLkdldFdvcmxkUG9pbnQocy5tX3ZlcnRpY2VzW2ldKSk7XG4gICAgfVxuXG4gICAgZ2MucHVzaChwKTtcbiAgfVxuXG4gIHJldHVybiBnYztcbn1cblxuZnVuY3Rpb24gZ2hvc3RfZ2V0X3doZWVsKHcpIHtcbiAgdmFyIGd3ID0gW107XG5cbiAgZm9yICh2YXIgZiA9IHcuR2V0Rml4dHVyZUxpc3QoKTsgZjsgZiA9IGYubV9uZXh0KSB7XG4gICAgdmFyIHMgPSBmLkdldFNoYXBlKCk7XG5cbiAgICB2YXIgYyA9IHtcbiAgICAgIHBvczogdy5HZXRXb3JsZFBvaW50KHMubV9wKSxcbiAgICAgIHJhZDogcy5tX3JhZGl1cyxcbiAgICAgIGFuZzogdy5tX3N3ZWVwLmFcbiAgICB9XG5cbiAgICBndy5wdXNoKGMpO1xuICB9XG5cbiAgcmV0dXJuIGd3O1xufVxuIiwiXG52YXIgZ2hvc3RfZ2V0X2ZyYW1lID0gcmVxdWlyZShcIi4vY2FyLXRvLWdob3N0LmpzXCIpO1xuXG52YXIgZW5hYmxlX2dob3N0ID0gdHJ1ZTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGdob3N0X2NyZWF0ZV9yZXBsYXk6IGdob3N0X2NyZWF0ZV9yZXBsYXksXG4gIGdob3N0X2NyZWF0ZV9naG9zdDogZ2hvc3RfY3JlYXRlX2dob3N0LFxuICBnaG9zdF9wYXVzZTogZ2hvc3RfcGF1c2UsXG4gIGdob3N0X3Jlc3VtZTogZ2hvc3RfcmVzdW1lLFxuICBnaG9zdF9nZXRfcG9zaXRpb246IGdob3N0X2dldF9wb3NpdGlvbixcbiAgZ2hvc3RfY29tcGFyZV90b19yZXBsYXk6IGdob3N0X2NvbXBhcmVfdG9fcmVwbGF5LFxuICBnaG9zdF9tb3ZlX2ZyYW1lOiBnaG9zdF9tb3ZlX2ZyYW1lLFxuICBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lOiBnaG9zdF9hZGRfcmVwbGF5X2ZyYW1lLFxuICBnaG9zdF9kcmF3X2ZyYW1lOiBnaG9zdF9kcmF3X2ZyYW1lLFxuICBnaG9zdF9yZXNldF9naG9zdDogZ2hvc3RfcmVzZXRfZ2hvc3Rcbn1cblxuZnVuY3Rpb24gZ2hvc3RfY3JlYXRlX3JlcGxheSgpIHtcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXG4gICAgcmV0dXJuIG51bGw7XG5cbiAgcmV0dXJuIHtcbiAgICBudW1fZnJhbWVzOiAwLFxuICAgIGZyYW1lczogW10sXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2hvc3RfY3JlYXRlX2dob3N0KCkge1xuICBpZiAoIWVuYWJsZV9naG9zdClcbiAgICByZXR1cm4gbnVsbDtcblxuICByZXR1cm4ge1xuICAgIHJlcGxheTogbnVsbCxcbiAgICBmcmFtZTogMCxcbiAgICBkaXN0OiAtMTAwXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2hvc3RfcmVzZXRfZ2hvc3QoZ2hvc3QpIHtcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGdob3N0LmZyYW1lID0gMDtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfcGF1c2UoZ2hvc3QpIHtcbiAgaWYgKGdob3N0ICE9IG51bGwpXG4gICAgZ2hvc3Qub2xkX2ZyYW1lID0gZ2hvc3QuZnJhbWU7XG4gIGdob3N0X3Jlc2V0X2dob3N0KGdob3N0KTtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfcmVzdW1lKGdob3N0KSB7XG4gIGlmIChnaG9zdCAhPSBudWxsKVxuICAgIGdob3N0LmZyYW1lID0gZ2hvc3Qub2xkX2ZyYW1lO1xufVxuXG5mdW5jdGlvbiBnaG9zdF9nZXRfcG9zaXRpb24oZ2hvc3QpIHtcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGlmIChnaG9zdC5mcmFtZSA8IDApXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QucmVwbGF5ID09IG51bGwpXG4gICAgcmV0dXJuO1xuICB2YXIgZnJhbWUgPSBnaG9zdC5yZXBsYXkuZnJhbWVzW2dob3N0LmZyYW1lXTtcbiAgcmV0dXJuIGZyYW1lLnBvcztcbn1cblxuZnVuY3Rpb24gZ2hvc3RfY29tcGFyZV90b19yZXBsYXkocmVwbGF5LCBnaG9zdCwgbWF4KSB7XG4gIGlmICghZW5hYmxlX2dob3N0KVxuICAgIHJldHVybjtcbiAgaWYgKGdob3N0ID09IG51bGwpXG4gICAgcmV0dXJuO1xuICBpZiAocmVwbGF5ID09IG51bGwpXG4gICAgcmV0dXJuO1xuXG4gIGlmIChnaG9zdC5kaXN0IDwgbWF4KSB7XG4gICAgZ2hvc3QucmVwbGF5ID0gcmVwbGF5O1xuICAgIGdob3N0LmRpc3QgPSBtYXg7XG4gICAgZ2hvc3QuZnJhbWUgPSAwO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdob3N0X21vdmVfZnJhbWUoZ2hvc3QpIHtcbiAgaWYgKCFlbmFibGVfZ2hvc3QpXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGlmIChnaG9zdC5yZXBsYXkgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGdob3N0LmZyYW1lKys7XG4gIGlmIChnaG9zdC5mcmFtZSA+PSBnaG9zdC5yZXBsYXkubnVtX2ZyYW1lcylcbiAgICBnaG9zdC5mcmFtZSA9IGdob3N0LnJlcGxheS5udW1fZnJhbWVzIC0gMTtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfYWRkX3JlcGxheV9mcmFtZShyZXBsYXksIGNhcikge1xuICBpZiAoIWVuYWJsZV9naG9zdClcbiAgICByZXR1cm47XG4gIGlmIChyZXBsYXkgPT0gbnVsbClcbiAgICByZXR1cm47XG5cbiAgdmFyIGZyYW1lID0gZ2hvc3RfZ2V0X2ZyYW1lKGNhcik7XG4gIHJlcGxheS5mcmFtZXMucHVzaChmcmFtZSk7XG4gIHJlcGxheS5udW1fZnJhbWVzKys7XG59XG5cbmZ1bmN0aW9uIGdob3N0X2RyYXdfZnJhbWUoY3R4LCBnaG9zdCwgY2FtZXJhKSB7XG4gIHZhciB6b29tID0gY2FtZXJhLnpvb207XG4gIGlmICghZW5hYmxlX2dob3N0KVxuICAgIHJldHVybjtcbiAgaWYgKGdob3N0ID09IG51bGwpXG4gICAgcmV0dXJuO1xuICBpZiAoZ2hvc3QuZnJhbWUgPCAwKVxuICAgIHJldHVybjtcbiAgaWYgKGdob3N0LnJlcGxheSA9PSBudWxsKVxuICAgIHJldHVybjtcblxuICB2YXIgZnJhbWUgPSBnaG9zdC5yZXBsYXkuZnJhbWVzW2dob3N0LmZyYW1lXTtcblxuICAvLyB3aGVlbCBzdHlsZVxuICBjdHguZmlsbFN0eWxlID0gXCIjZWVlXCI7XG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiI2FhYVwiO1xuICBjdHgubGluZVdpZHRoID0gMSAvIHpvb207XG5cbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBmcmFtZS53aGVlbHMubGVuZ3RoOyBpKyspIHtcbiAgICBmb3IgKHZhciB3IGluIGZyYW1lLndoZWVsc1tpXSkge1xuICAgICAgZ2hvc3RfZHJhd19jaXJjbGUoY3R4LCBmcmFtZS53aGVlbHNbaV1bd10ucG9zLCBmcmFtZS53aGVlbHNbaV1bd10ucmFkLCBmcmFtZS53aGVlbHNbaV1bd10uYW5nKTtcbiAgICB9XG4gIH1cblxuICAvLyBjaGFzc2lzIHN0eWxlXG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiI2FhYVwiO1xuICBjdHguZmlsbFN0eWxlID0gXCIjZWVlXCI7XG4gIGN0eC5saW5lV2lkdGggPSAxIC8gem9vbTtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBmb3IgKHZhciBjIGluIGZyYW1lLmNoYXNzaXMpXG4gICAgZ2hvc3RfZHJhd19wb2x5KGN0eCwgZnJhbWUuY2hhc3Npc1tjXS52dHgsIGZyYW1lLmNoYXNzaXNbY10ubnVtKTtcbiAgY3R4LmZpbGwoKTtcbiAgY3R4LnN0cm9rZSgpO1xufVxuXG5mdW5jdGlvbiBnaG9zdF9kcmF3X3BvbHkoY3R4LCB2dHgsIG5fdnR4KSB7XG4gIGN0eC5tb3ZlVG8odnR4WzBdLngsIHZ0eFswXS55KTtcbiAgZm9yICh2YXIgaSA9IDE7IGkgPCBuX3Z0eDsgaSsrKSB7XG4gICAgY3R4LmxpbmVUbyh2dHhbaV0ueCwgdnR4W2ldLnkpO1xuICB9XG4gIGN0eC5saW5lVG8odnR4WzBdLngsIHZ0eFswXS55KTtcbn1cblxuZnVuY3Rpb24gZ2hvc3RfZHJhd19jaXJjbGUoY3R4LCBjZW50ZXIsIHJhZGl1cywgYW5nbGUpIHtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHguYXJjKGNlbnRlci54LCBjZW50ZXIueSwgcmFkaXVzLCAwLCAyICogTWF0aC5QSSwgdHJ1ZSk7XG5cbiAgY3R4Lm1vdmVUbyhjZW50ZXIueCwgY2VudGVyLnkpO1xuICBjdHgubGluZVRvKGNlbnRlci54ICsgcmFkaXVzICogTWF0aC5jb3MoYW5nbGUpLCBjZW50ZXIueSArIHJhZGl1cyAqIE1hdGguc2luKGFuZ2xlKSk7XG5cbiAgY3R4LmZpbGwoKTtcbiAgY3R4LnN0cm9rZSgpO1xufVxuIiwiLyogZ2xvYmFscyBkb2N1bWVudCBwZXJmb3JtYW5jZSBsb2NhbFN0b3JhZ2UgYWxlcnQgY29uZmlybSBidG9hIEhUTUxEaXZFbGVtZW50ICovXHJcbi8qIGdsb2JhbHMgYjJWZWMyICovXHJcbi8vIEdsb2JhbCBWYXJzXHJcblxyXG52YXIgd29ybGRSdW4gPSByZXF1aXJlKFwiLi93b3JsZC9ydW4uanNcIik7XHJcbnZhciBjYXJDb25zdHJ1Y3QgPSByZXF1aXJlKFwiLi9jYXItc2NoZW1hL2NvbnN0cnVjdC5qc1wiKTtcclxuXHJcbnZhciBtYW5hZ2VSb3VuZCA9IHJlcXVpcmUoXCIuL21hY2hpbmUtbGVhcm5pbmcvZ2VuZXRpYy1hbGdvcml0aG0vbWFuYWdlLXJvdW5kLmpzXCIpO1xyXG5cclxudmFyIGdob3N0X2ZucyA9IHJlcXVpcmUoXCIuL2dob3N0L2luZGV4LmpzXCIpO1xyXG5cclxudmFyIGRyYXdDYXIgPSByZXF1aXJlKFwiLi9kcmF3L2RyYXctY2FyLmpzXCIpO1xyXG52YXIgZ3JhcGhfZm5zID0gcmVxdWlyZShcIi4vZHJhdy9wbG90LWdyYXBocy5qc1wiKTtcclxudmFyIHBsb3RfZ3JhcGhzID0gZ3JhcGhfZm5zLnBsb3RHcmFwaHM7XHJcbnZhciBjd19jbGVhckdyYXBoaWNzID0gZ3JhcGhfZm5zLmNsZWFyR3JhcGhpY3M7XHJcbnZhciBjd19kcmF3Rmxvb3IgPSByZXF1aXJlKFwiLi9kcmF3L2RyYXctZmxvb3IuanNcIik7XHJcblxyXG52YXIgZ2hvc3RfZHJhd19mcmFtZSA9IGdob3N0X2Zucy5naG9zdF9kcmF3X2ZyYW1lO1xyXG52YXIgZ2hvc3RfY3JlYXRlX2dob3N0ID0gZ2hvc3RfZm5zLmdob3N0X2NyZWF0ZV9naG9zdDtcclxudmFyIGdob3N0X2FkZF9yZXBsYXlfZnJhbWUgPSBnaG9zdF9mbnMuZ2hvc3RfYWRkX3JlcGxheV9mcmFtZTtcclxudmFyIGdob3N0X2NvbXBhcmVfdG9fcmVwbGF5ID0gZ2hvc3RfZm5zLmdob3N0X2NvbXBhcmVfdG9fcmVwbGF5O1xyXG52YXIgZ2hvc3RfZ2V0X3Bvc2l0aW9uID0gZ2hvc3RfZm5zLmdob3N0X2dldF9wb3NpdGlvbjtcclxudmFyIGdob3N0X21vdmVfZnJhbWUgPSBnaG9zdF9mbnMuZ2hvc3RfbW92ZV9mcmFtZTtcclxudmFyIGdob3N0X3Jlc2V0X2dob3N0ID0gZ2hvc3RfZm5zLmdob3N0X3Jlc2V0X2dob3N0XHJcbnZhciBnaG9zdF9wYXVzZSA9IGdob3N0X2Zucy5naG9zdF9wYXVzZTtcclxudmFyIGdob3N0X3Jlc3VtZSA9IGdob3N0X2Zucy5naG9zdF9yZXN1bWU7XHJcbnZhciBnaG9zdF9jcmVhdGVfcmVwbGF5ID0gZ2hvc3RfZm5zLmdob3N0X2NyZWF0ZV9yZXBsYXk7XHJcblxyXG52YXIgY3dfQ2FyID0gcmVxdWlyZShcIi4vZHJhdy9kcmF3LWNhci1zdGF0cy5qc1wiKTtcclxudmFyIGdob3N0O1xyXG52YXIgY2FyTWFwID0gbmV3IE1hcCgpO1xyXG5cclxudmFyIGRvRHJhdyA9IHRydWU7XHJcbnZhciBjd19wYXVzZWQgPSBmYWxzZTtcclxuXHJcbnZhciBib3gyZGZwcyA9IDYwO1xyXG52YXIgc2NyZWVuZnBzID0gNjA7XHJcbnZhciBza2lwVGlja3MgPSBNYXRoLnJvdW5kKDEwMDAgLyBib3gyZGZwcyk7XHJcbnZhciBtYXhGcmFtZVNraXAgPSBza2lwVGlja3MgKiAyO1xyXG5cclxudmFyIGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWFpbmJveFwiKTtcclxudmFyIGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcblxyXG52YXIgY2FtZXJhID0ge1xyXG4gIHNwZWVkOiAwLjA1LFxyXG4gIHBvczoge1xyXG4gICAgeDogMCwgeTogMFxyXG4gIH0sXHJcbiAgdGFyZ2V0OiAtMSxcclxuICB6b29tOiA3MFxyXG59XHJcblxyXG52YXIgbWluaW1hcGNhbWVyYSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWluaW1hcGNhbWVyYVwiKS5zdHlsZTtcclxudmFyIG1pbmltYXBob2xkZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI21pbmltYXBob2xkZXJcIik7XHJcblxyXG52YXIgbWluaW1hcGNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibWluaW1hcFwiKTtcclxudmFyIG1pbmltYXBjdHggPSBtaW5pbWFwY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxudmFyIG1pbmltYXBzY2FsZSA9IDM7XHJcbnZhciBtaW5pbWFwZm9nZGlzdGFuY2UgPSAwO1xyXG52YXIgZm9nZGlzdGFuY2UgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm1pbmltYXBmb2dcIikuc3R5bGU7XHJcblxyXG5cclxudmFyIGNhckNvbnN0YW50cyA9IGNhckNvbnN0cnVjdC5jYXJDb25zdGFudHMoKTtcclxuXHJcblxyXG52YXIgbWF4X2Nhcl9oZWFsdGggPSBib3gyZGZwcyAqIDEwO1xyXG5cclxudmFyIGN3X2dob3N0UmVwbGF5SW50ZXJ2YWwgPSBudWxsO1xyXG5cclxudmFyIGRpc3RhbmNlTWV0ZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImRpc3RhbmNlbWV0ZXJcIik7XHJcbnZhciBoZWlnaHRNZXRlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaGVpZ2h0bWV0ZXJcIik7XHJcblxyXG52YXIgbGVhZGVyUG9zaXRpb24gPSB7XHJcbiAgeDogMCwgeTogMFxyXG59XHJcblxyXG5taW5pbWFwY2FtZXJhLndpZHRoID0gMTIgKiBtaW5pbWFwc2NhbGUgKyBcInB4XCI7XHJcbm1pbmltYXBjYW1lcmEuaGVpZ2h0ID0gNiAqIG1pbmltYXBzY2FsZSArIFwicHhcIjtcclxuXHJcblxyXG4vLyA9PT09PT09IFdPUkxEIFNUQVRFID09PT09PVxyXG52YXIgZ2VuZXJhdGlvbkNvbmZpZyA9IHJlcXVpcmUoXCIuL2dlbmVyYXRpb24tY29uZmlnXCIpO1xyXG5cclxuXHJcbnZhciB3b3JsZF9kZWYgPSB7XHJcbiAgZ3Jhdml0eTogbmV3IGIyVmVjMigwLjAsIC05LjgxKSxcclxuICBkb1NsZWVwOiB0cnVlLFxyXG4gIGZsb29yc2VlZDogYnRvYShNYXRoLnNlZWRyYW5kb20oKSksXHJcbiAgdGlsZURpbWVuc2lvbnM6IG5ldyBiMlZlYzIoMS41LCAwLjE1KSxcclxuICBtYXhGbG9vclRpbGVzOiAyMDAsXHJcbiAgbXV0YWJsZV9mbG9vcjogZmFsc2UsXHJcbiAgYm94MmRmcHM6IGJveDJkZnBzLFxyXG4gIG1vdG9yU3BlZWQ6IDIwLFxyXG4gIG1heF9jYXJfaGVhbHRoOiBtYXhfY2FyX2hlYWx0aCxcclxuICBzY2hlbWE6IGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLnNjaGVtYVxyXG59XHJcblxyXG52YXIgY3dfZGVhZENhcnM7XHJcblxyXG52YXIgYXJyT2ZHcmFwaFN0YXRlcyA9IFtdO1xyXG5cclxudmFyIGdyYXBoU3RhdGUgPSB7XHJcbiAgY3dfdG9wU2NvcmVzOiBbXSxcclxuICBjd19ncmFwaEF2ZXJhZ2U6IFtdLFxyXG4gIGN3X2dyYXBoRWxpdGU6IFtdLFxyXG4gIGN3X2dyYXBoVG9wOiBbXSxcclxufTtcclxuXHJcbmZ1bmN0aW9uIHJlc2V0R3JhcGhTdGF0ZSgpe1xyXG4gIGdyYXBoU3RhdGUgPSB7XHJcbiAgICBjd190b3BTY29yZXM6IFtdLFxyXG4gICAgY3dfZ3JhcGhBdmVyYWdlOiBbXSxcclxuICAgIGN3X2dyYXBoRWxpdGU6IFtdLFxyXG4gICAgY3dfZ3JhcGhUb3A6IFtdLFxyXG4gIH07XHJcbn1cclxuXHJcblxyXG5cclxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuXHJcbnZhciBnZW5lcmF0aW9uU3RhdGU7XHJcblxyXG4vLyA9PT09PT09PSBBY3Rpdml0eSBTdGF0ZSA9PT09XHJcbnZhciBjdXJyZW50UnVubmVyO1xyXG52YXIgbG9vcHMgPSAwO1xyXG52YXIgbmV4dEdhbWVUaWNrID0gKG5ldyBEYXRlKS5nZXRUaW1lKCk7XHJcblxyXG5mdW5jdGlvbiBzaG93RGlzdGFuY2UoZGlzdGFuY2UsIGhlaWdodCkge1xyXG4gIGRpc3RhbmNlTWV0ZXIuaW5uZXJIVE1MID0gZGlzdGFuY2UgKyBcIiBtZXRlcnM8YnIgLz5cIjtcclxuICBoZWlnaHRNZXRlci5pbm5lckhUTUwgPSBoZWlnaHQgKyBcIiBtZXRlcnNcIjtcclxuICBpZiAoZGlzdGFuY2UgPiBtaW5pbWFwZm9nZGlzdGFuY2UpIHtcclxuICAgIGZvZ2Rpc3RhbmNlLndpZHRoID0gODAwIC0gTWF0aC5yb3VuZChkaXN0YW5jZSArIDE1KSAqIG1pbmltYXBzY2FsZSArIFwicHhcIjtcclxuICAgIG1pbmltYXBmb2dkaXN0YW5jZSA9IGRpc3RhbmNlO1xyXG4gIH1cclxufVxyXG5cclxuXHJcblxyXG4vKiA9PT0gRU5EIENhciA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuXHJcblxyXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcbi8qID09PT0gR2VuZXJhdGlvbiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuXHJcbmZ1bmN0aW9uIGN3X2dlbmVyYXRpb25aZXJvKCkge1xyXG5cclxuICBnZW5lcmF0aW9uU3RhdGUgPSBtYW5hZ2VSb3VuZC5nZW5lcmF0aW9uWmVybyhnZW5lcmF0aW9uQ29uZmlnKCkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiByZXNldENhclVJKCl7XHJcbiAgY3dfZGVhZENhcnMgPSAwO1xyXG4gIGxlYWRlclBvc2l0aW9uID0ge1xyXG4gICAgeDogMCwgeTogMFxyXG4gIH07XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJnZW5lcmF0aW9uXCIpLmlubmVySFRNTCA9IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyLnRvU3RyaW5nKCk7XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjYXJzXCIpLmlubmVySFRNTCA9IFwiXCI7XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJwb3B1bGF0aW9uXCIpLmlubmVySFRNTCA9IGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmdlbmVyYXRpb25TaXplLnRvU3RyaW5nKCk7XHJcbn1cclxuXHJcbi8qID09PT0gRU5EIEdlbnJhdGlvbiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG5cclxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG4vKiA9PT09IERyYXdpbmcgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXHJcblxyXG5mdW5jdGlvbiBjd19kcmF3U2NyZWVuKCkge1xyXG4gIHZhciBmbG9vclRpbGVzID0gY3VycmVudFJ1bm5lci5zY2VuZS5mbG9vclRpbGVzO1xyXG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcclxuICBjdHguc2F2ZSgpO1xyXG4gIGN3X3NldENhbWVyYVBvc2l0aW9uKCk7XHJcbiAgdmFyIGNhbWVyYV94ID0gY2FtZXJhLnBvcy54O1xyXG4gIHZhciBjYW1lcmFfeSA9IGNhbWVyYS5wb3MueTtcclxuICB2YXIgem9vbSA9IGNhbWVyYS56b29tO1xyXG4gIGN0eC50cmFuc2xhdGUoMjAwIC0gKGNhbWVyYV94ICogem9vbSksIDIwMCArIChjYW1lcmFfeSAqIHpvb20pKTtcclxuICBjdHguc2NhbGUoem9vbSwgLXpvb20pO1xyXG4gIGN3X2RyYXdGbG9vcihjdHgsIGNhbWVyYSwgZmxvb3JUaWxlcyk7XHJcbiAgZ2hvc3RfZHJhd19mcmFtZShjdHgsIGdob3N0LCBjYW1lcmEpO1xyXG4gIGN3X2RyYXdDYXJzKCk7XHJcbiAgY3R4LnJlc3RvcmUoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfbWluaW1hcENhbWVyYSgvKiB4LCB5Ki8pIHtcclxuICB2YXIgY2FtZXJhX3ggPSBjYW1lcmEucG9zLnhcclxuICB2YXIgY2FtZXJhX3kgPSBjYW1lcmEucG9zLnlcclxuICBtaW5pbWFwY2FtZXJhLmxlZnQgPSBNYXRoLnJvdW5kKCgyICsgY2FtZXJhX3gpICogbWluaW1hcHNjYWxlKSArIFwicHhcIjtcclxuICBtaW5pbWFwY2FtZXJhLnRvcCA9IE1hdGgucm91bmQoKDMxIC0gY2FtZXJhX3kpICogbWluaW1hcHNjYWxlKSArIFwicHhcIjtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc2V0Q2FtZXJhVGFyZ2V0KGspIHtcclxuICBjYW1lcmEudGFyZ2V0ID0gaztcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc2V0Q2FtZXJhUG9zaXRpb24oKSB7XHJcbiAgdmFyIGNhbWVyYVRhcmdldFBvc2l0aW9uXHJcbiAgaWYgKGNhbWVyYS50YXJnZXQgIT09IC0xKSB7XHJcbiAgICBjYW1lcmFUYXJnZXRQb3NpdGlvbiA9IGNhck1hcC5nZXQoY2FtZXJhLnRhcmdldCkuZ2V0UG9zaXRpb24oKTtcclxuICB9IGVsc2Uge1xyXG4gICAgY2FtZXJhVGFyZ2V0UG9zaXRpb24gPSBsZWFkZXJQb3NpdGlvbjtcclxuICB9XHJcbiAgdmFyIGRpZmZfeSA9IGNhbWVyYS5wb3MueSAtIGNhbWVyYVRhcmdldFBvc2l0aW9uLnk7XHJcbiAgdmFyIGRpZmZfeCA9IGNhbWVyYS5wb3MueCAtIGNhbWVyYVRhcmdldFBvc2l0aW9uLng7XHJcbiAgY2FtZXJhLnBvcy55IC09IGNhbWVyYS5zcGVlZCAqIGRpZmZfeTtcclxuICBjYW1lcmEucG9zLnggLT0gY2FtZXJhLnNwZWVkICogZGlmZl94O1xyXG4gIGN3X21pbmltYXBDYW1lcmEoY2FtZXJhLnBvcy54LCBjYW1lcmEucG9zLnkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19kcmF3R2hvc3RSZXBsYXkoKSB7XHJcbiAgdmFyIGZsb29yVGlsZXMgPSBjdXJyZW50UnVubmVyLnNjZW5lLmZsb29yVGlsZXM7XHJcbiAgdmFyIGNhclBvc2l0aW9uID0gZ2hvc3RfZ2V0X3Bvc2l0aW9uKGdob3N0KTtcclxuICBjYW1lcmEucG9zLnggPSBjYXJQb3NpdGlvbi54O1xyXG4gIGNhbWVyYS5wb3MueSA9IGNhclBvc2l0aW9uLnk7XHJcbiAgY3dfbWluaW1hcENhbWVyYShjYW1lcmEucG9zLngsIGNhbWVyYS5wb3MueSk7XHJcbiAgc2hvd0Rpc3RhbmNlKFxyXG4gICAgTWF0aC5yb3VuZChjYXJQb3NpdGlvbi54ICogMTAwKSAvIDEwMCxcclxuICAgIE1hdGgucm91bmQoY2FyUG9zaXRpb24ueSAqIDEwMCkgLyAxMDBcclxuICApO1xyXG4gIGN0eC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcclxuICBjdHguc2F2ZSgpO1xyXG4gIGN0eC50cmFuc2xhdGUoXHJcbiAgICAyMDAgLSAoY2FyUG9zaXRpb24ueCAqIGNhbWVyYS56b29tKSxcclxuICAgIDIwMCArIChjYXJQb3NpdGlvbi55ICogY2FtZXJhLnpvb20pXHJcbiAgKTtcclxuICBjdHguc2NhbGUoY2FtZXJhLnpvb20sIC1jYW1lcmEuem9vbSk7XHJcbiAgZ2hvc3RfZHJhd19mcmFtZShjdHgsIGdob3N0KTtcclxuICBnaG9zdF9tb3ZlX2ZyYW1lKGdob3N0KTtcclxuICBjd19kcmF3Rmxvb3IoY3R4LCBjYW1lcmEsIGZsb29yVGlsZXMpO1xyXG4gIGN0eC5yZXN0b3JlKCk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjd19kcmF3Q2FycygpIHtcclxuICB2YXIgY3dfY2FyQXJyYXkgPSBBcnJheS5mcm9tKGNhck1hcC52YWx1ZXMoKSk7XHJcbiAgZm9yICh2YXIgayA9IChjd19jYXJBcnJheS5sZW5ndGggLSAxKTsgayA+PSAwOyBrLS0pIHtcclxuICAgIHZhciBteUNhciA9IGN3X2NhckFycmF5W2tdO1xyXG4gICAgZHJhd0NhcihjYXJDb25zdGFudHMsIG15Q2FyLCBjYW1lcmEsIGN0eClcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHRvZ2dsZURpc3BsYXkoKSB7XHJcbiAgY2FudmFzLndpZHRoID0gY2FudmFzLndpZHRoO1xyXG4gIGlmIChkb0RyYXcpIHtcclxuICAgIGRvRHJhdyA9IGZhbHNlO1xyXG4gICAgY3dfc3RvcFNpbXVsYXRpb24oKTtcclxuICAgIGN3X3J1bm5pbmdJbnRlcnZhbCA9IHNldEludGVydmFsKGZ1bmN0aW9uICgpIHtcclxuICAgICAgdmFyIHRpbWUgPSBwZXJmb3JtYW5jZS5ub3coKSArICgxMDAwIC8gc2NyZWVuZnBzKTtcclxuICAgICAgd2hpbGUgKHRpbWUgPiBwZXJmb3JtYW5jZS5ub3coKSkge1xyXG4gICAgICAgIHNpbXVsYXRpb25TdGVwKCk7XHJcbiAgICAgIH1cclxuICAgIH0sIDEpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBkb0RyYXcgPSB0cnVlO1xyXG4gICAgY2xlYXJJbnRlcnZhbChjd19ydW5uaW5nSW50ZXJ2YWwpO1xyXG4gICAgY3dfc3RhcnRTaW11bGF0aW9uKCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjd19kcmF3TWluaU1hcCgpIHtcclxuICB2YXIgZmxvb3JUaWxlcyA9IGN1cnJlbnRSdW5uZXIuc2NlbmUuZmxvb3JUaWxlcztcclxuICB2YXIgbGFzdF90aWxlID0gbnVsbDtcclxuICB2YXIgdGlsZV9wb3NpdGlvbiA9IG5ldyBiMlZlYzIoLTUsIDApO1xyXG4gIG1pbmltYXBmb2dkaXN0YW5jZSA9IDA7XHJcbiAgZm9nZGlzdGFuY2Uud2lkdGggPSBcIjgwMHB4XCI7XHJcbiAgbWluaW1hcGNhbnZhcy53aWR0aCA9IG1pbmltYXBjYW52YXMud2lkdGg7XHJcbiAgbWluaW1hcGN0eC5zdHJva2VTdHlsZSA9IFwiIzNGNzJBRlwiO1xyXG4gIG1pbmltYXBjdHguYmVnaW5QYXRoKCk7XHJcbiAgbWluaW1hcGN0eC5tb3ZlVG8oMCwgMzUgKiBtaW5pbWFwc2NhbGUpO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgZmxvb3JUaWxlcy5sZW5ndGg7IGsrKykge1xyXG4gICAgbGFzdF90aWxlID0gZmxvb3JUaWxlc1trXTtcclxuICAgIHZhciBsYXN0X2ZpeHR1cmUgPSBsYXN0X3RpbGUuR2V0Rml4dHVyZUxpc3QoKTtcclxuICAgIHZhciBsYXN0X3dvcmxkX2Nvb3JkcyA9IGxhc3RfdGlsZS5HZXRXb3JsZFBvaW50KGxhc3RfZml4dHVyZS5HZXRTaGFwZSgpLm1fdmVydGljZXNbM10pO1xyXG4gICAgdGlsZV9wb3NpdGlvbiA9IGxhc3Rfd29ybGRfY29vcmRzO1xyXG4gICAgbWluaW1hcGN0eC5saW5lVG8oKHRpbGVfcG9zaXRpb24ueCArIDUpICogbWluaW1hcHNjYWxlLCAoLXRpbGVfcG9zaXRpb24ueSArIDM1KSAqIG1pbmltYXBzY2FsZSk7XHJcbiAgfVxyXG4gIG1pbmltYXBjdHguc3Ryb2tlKCk7XHJcbn1cclxuXHJcbi8qID09PT0gRU5EIERyYXdpbmcgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cclxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xyXG52YXIgdWlMaXN0ZW5lcnMgPSB7XHJcbiAgcHJlQ2FyU3RlcDogZnVuY3Rpb24oKXtcclxuICAgIGdob3N0X21vdmVfZnJhbWUoZ2hvc3QpO1xyXG4gIH0sXHJcbiAgY2FyU3RlcChjYXIpe1xyXG4gICAgdXBkYXRlQ2FyVUkoY2FyKTtcclxuICB9LFxyXG4gIGNhckRlYXRoKGNhckluZm8pe1xyXG5cclxuICAgIHZhciBrID0gY2FySW5mby5pbmRleDtcclxuXHJcbiAgICB2YXIgY2FyID0gY2FySW5mby5jYXIsIHNjb3JlID0gY2FySW5mby5zY29yZTtcclxuICAgIGNhck1hcC5nZXQoY2FySW5mbykua2lsbChjdXJyZW50UnVubmVyLCB3b3JsZF9kZWYpO1xyXG5cclxuICAgIC8vIHJlZm9jdXMgY2FtZXJhIHRvIGxlYWRlciBvbiBkZWF0aFxyXG4gICAgaWYgKGNhbWVyYS50YXJnZXQgPT0gY2FySW5mbykge1xyXG4gICAgICBjd19zZXRDYW1lcmFUYXJnZXQoLTEpO1xyXG4gICAgfVxyXG4gICAgLy8gY29uc29sZS5sb2coc2NvcmUpO1xyXG4gICAgY2FyTWFwLmRlbGV0ZShjYXJJbmZvKTtcclxuICAgIGdob3N0X2NvbXBhcmVfdG9fcmVwbGF5KGNhci5yZXBsYXksIGdob3N0LCBzY29yZS52KTtcclxuICAgIHNjb3JlLmkgPSBnZW5lcmF0aW9uU3RhdGUuY291bnRlcjtcclxuXHJcbiAgICBjd19kZWFkQ2FycysrO1xyXG4gICAgdmFyIGdlbmVyYXRpb25TaXplID0gZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuZ2VuZXJhdGlvblNpemU7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInBvcHVsYXRpb25cIikuaW5uZXJIVE1MID0gKGdlbmVyYXRpb25TaXplIC0gY3dfZGVhZENhcnMpLnRvU3RyaW5nKCk7XHJcblxyXG4gICAgLy8gY29uc29sZS5sb2cobGVhZGVyUG9zaXRpb24ubGVhZGVyLCBrKVxyXG4gICAgaWYgKGxlYWRlclBvc2l0aW9uLmxlYWRlciA9PSBrKSB7XHJcbiAgICAgIC8vIGxlYWRlciBpcyBkZWFkLCBmaW5kIG5ldyBsZWFkZXJcclxuICAgICAgY3dfZmluZExlYWRlcigpO1xyXG4gICAgfVxyXG4gIH0sXHJcbiAgZ2VuZXJhdGlvbkVuZChyZXN1bHRzKXtcclxuICAgIGNsZWFudXBSb3VuZChyZXN1bHRzKTtcclxuICAgIHJldHVybiBjd19uZXdSb3VuZChyZXN1bHRzKTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNpbXVsYXRpb25TdGVwKCkgeyAgXHJcbiAgY3VycmVudFJ1bm5lci5zdGVwKCk7XHJcbiAgc2hvd0Rpc3RhbmNlKFxyXG4gICAgTWF0aC5yb3VuZChsZWFkZXJQb3NpdGlvbi54ICogMTAwKSAvIDEwMCxcclxuICAgIE1hdGgucm91bmQobGVhZGVyUG9zaXRpb24ueSAqIDEwMCkgLyAxMDBcclxuICApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBnYW1lTG9vcCgpIHtcclxuICAvKmxvb3BzID0gMDtcclxuICB3aGlsZSAoIWN3X3BhdXNlZCAmJiAobmV3IERhdGUpLmdldFRpbWUoKSA+IG5leHRHYW1lVGljayAmJiBsb29wcyA8IG1heEZyYW1lU2tpcCkgeyAgIFxyXG4gICAgbmV4dEdhbWVUaWNrICs9IHNraXBUaWNrcztcclxuICAgIGxvb3BzKys7XHJcbiAgfVxyXG4gIHNpbXVsYXRpb25TdGVwKCk7XHJcbiAgY3dfZHJhd1NjcmVlbigpO1xyXG5cdCovXHJcblx0ZmFzdEZvcndhcmQoKTsvL3VzZWQgZm9yIHRlc3RpbmcgZGF0YVxyXG4gIGlmKCFjd19wYXVzZWQpIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZ2FtZUxvb3ApO1xyXG59XHJcblxyXG5mdW5jdGlvbiB1cGRhdGVDYXJVSShjYXJJbmZvKXtcclxuICB2YXIgayA9IGNhckluZm8uaW5kZXg7XHJcbiAgdmFyIGNhciA9IGNhck1hcC5nZXQoY2FySW5mbyk7XHJcbiAgdmFyIHBvc2l0aW9uID0gY2FyLmdldFBvc2l0aW9uKCk7XHJcblxyXG4gIGdob3N0X2FkZF9yZXBsYXlfZnJhbWUoY2FyLnJlcGxheSwgY2FyLmNhci5jYXIpO1xyXG4gIGNhci5taW5pbWFwbWFya2VyLnN0eWxlLmxlZnQgPSBNYXRoLnJvdW5kKChwb3NpdGlvbi54ICsgNSkgKiBtaW5pbWFwc2NhbGUpICsgXCJweFwiO1xyXG4gIGNhci5oZWFsdGhCYXIud2lkdGggPSBNYXRoLnJvdW5kKChjYXIuY2FyLnN0YXRlLmhlYWx0aCAvIG1heF9jYXJfaGVhbHRoKSAqIDEwMCkgKyBcIiVcIjtcclxuICBpZiAocG9zaXRpb24ueCA+IGxlYWRlclBvc2l0aW9uLngpIHtcclxuICAgIGxlYWRlclBvc2l0aW9uID0gcG9zaXRpb247XHJcbiAgICBsZWFkZXJQb3NpdGlvbi5sZWFkZXIgPSBrO1xyXG4gICAgLy8gY29uc29sZS5sb2coXCJuZXcgbGVhZGVyOiBcIiwgayk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjd19maW5kTGVhZGVyKCkge1xyXG4gIHZhciBsZWFkID0gMDtcclxuICB2YXIgY3dfY2FyQXJyYXkgPSBBcnJheS5mcm9tKGNhck1hcC52YWx1ZXMoKSk7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBjd19jYXJBcnJheS5sZW5ndGg7IGsrKykge1xyXG4gICAgaWYgKCFjd19jYXJBcnJheVtrXS5hbGl2ZSkge1xyXG4gICAgICBjb250aW51ZTtcclxuICAgIH1cclxuICAgIHZhciBwb3NpdGlvbiA9IGN3X2NhckFycmF5W2tdLmdldFBvc2l0aW9uKCk7XHJcbiAgICBpZiAocG9zaXRpb24ueCA+IGxlYWQpIHtcclxuICAgICAgbGVhZGVyUG9zaXRpb24gPSBwb3NpdGlvbjtcclxuICAgICAgbGVhZGVyUG9zaXRpb24ubGVhZGVyID0gaztcclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZhc3RGb3J3YXJkKCl7XHJcbiAgdmFyIGdlbiA9IGdlbmVyYXRpb25TdGF0ZS5jb3VudGVyO1xyXG4gIHdoaWxlKGdlbiA9PT0gZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXIpe1xyXG4gICAgY3VycmVudFJ1bm5lci5zdGVwKCk7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBjbGVhbnVwUm91bmQocmVzdWx0cyl7XHJcblxyXG4gIHJlc3VsdHMuc29ydChmdW5jdGlvbiAoYSwgYikge1xyXG4gICAgaWYgKGEuc2NvcmUudiA+IGIuc2NvcmUudikge1xyXG4gICAgICByZXR1cm4gLTFcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIHJldHVybiAxXHJcbiAgICB9XHJcbiAgfSlcclxuICBncmFwaFN0YXRlID0gcGxvdF9ncmFwaHMoXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImdyYXBoY2FudmFzXCIpLFxyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0b3BzY29yZXNcIiksXHJcbiAgICBudWxsLFxyXG4gICAgZ3JhcGhTdGF0ZSxcclxuICAgIHJlc3VsdHNcclxuICApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19uZXdSb3VuZChyZXN1bHRzKSB7XHJcbiAgY2FtZXJhLnBvcy54ID0gY2FtZXJhLnBvcy55ID0gMDtcclxuICBjd19zZXRDYW1lcmFUYXJnZXQoLTEpO1xyXG4gIGdlbmVyYXRpb25TdGF0ZSA9bWFuYWdlUm91bmQubmV4dEdlbmVyYXRpb24oXHJcbiAgICBnZW5lcmF0aW9uU3RhdGUsIHJlc3VsdHMsIGdlbmVyYXRpb25Db25maWcoKSk7XHJcblx0XHJcblx0aWYoZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXI9PT0wKXtcclxuXHRcdHZhciByb3VuZHMgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInJvdW5kXCIpO1xyXG5cdFx0dmFyIG5ld1JvdW5kcyA9IGdlbmVyYXRpb25TdGF0ZS5yb3VuZCtyb3VuZHM7XHJcblx0XHRsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcIkVBLUEtXCIrbmV3Um91bmRzLCBKU09OLnN0cmluZ2lmeShncmFwaFN0YXRlLmN3X2dyYXBoQXZlcmFnZSkpO1xyXG5cdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJFQS1ULVwiK25ld1JvdW5kcywgSlNPTi5zdHJpbmdpZnkoZ3JhcGhTdGF0ZS5jd19ncmFwaFRvcCkpO1xyXG5cdFx0bG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJyb3VuZFwiLCBuZXdSb3VuZHMpO1xyXG5cdFx0Ly9ncmFwaFN0YXRlLmN3X2dyYXBoQXZlcmFnZSA9IG5ldyBBcnJheSgpO1xyXG5cdFx0Ly9yZXNldEdyYXBoU3RhdGUoKTtcclxuXHRcdGxvY2F0aW9uLnJlbG9hZCgpO1xyXG5cdH1cclxuXHRcclxuXHRcclxuICBpZiAod29ybGRfZGVmLm11dGFibGVfZmxvb3IpIHtcclxuICAgIC8vIEdIT1NUIERJU0FCTEVEXHJcbiAgICBnaG9zdCA9IG51bGw7XHJcbiAgICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gYnRvYShNYXRoLnNlZWRyYW5kb20oKSk7XHJcbiAgfSBlbHNlIHtcclxuICAgIC8vIFJFLUVOQUJMRSBHSE9TVFxyXG4gICAgZ2hvc3RfcmVzZXRfZ2hvc3QoZ2hvc3QpO1xyXG4gIH1cclxuICBjdXJyZW50UnVubmVyID0gd29ybGRSdW4od29ybGRfZGVmLCBnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbiwgdWlMaXN0ZW5lcnMpO1xyXG4gIHNldHVwQ2FyVUkoKTtcclxuICBjd19kcmF3TWluaU1hcCgpO1xyXG4gIHJlc2V0Q2FyVUkoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc3RhcnRTaW11bGF0aW9uKCkge1xyXG4gIGN3X3BhdXNlZCA9IGZhbHNlO1xyXG4gIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoZ2FtZUxvb3ApO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zdG9wU2ltdWxhdGlvbigpIHtcclxuICBjd19wYXVzZWQgPSB0cnVlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19jbGVhclBvcHVsYXRpb25Xb3JsZCgpIHtcclxuICBjYXJNYXAuZm9yRWFjaChmdW5jdGlvbihjYXIpe1xyXG4gICAgY2FyLmtpbGwoY3VycmVudFJ1bm5lciwgd29ybGRfZGVmKTtcclxuICB9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfcmVzZXRQb3B1bGF0aW9uVUkoKSB7XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJnZW5lcmF0aW9uXCIpLmlubmVySFRNTCA9IFwiXCI7XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjYXJzXCIpLmlubmVySFRNTCA9IFwiXCI7XHJcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJ0b3BzY29yZXNcIikuaW5uZXJIVE1MID0gXCJcIjtcclxuICBjd19jbGVhckdyYXBoaWNzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZ3JhcGhjYW52YXNcIikpO1xyXG4gIHJlc2V0R3JhcGhTdGF0ZSgpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19yZXNldFdvcmxkKCkge1xyXG4gIGRvRHJhdyA9IHRydWU7XHJcbiAgY3dfc3RvcFNpbXVsYXRpb24oKTtcclxuICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJuZXdzZWVkXCIpLnZhbHVlO1xyXG4gIGN3X2NsZWFyUG9wdWxhdGlvbldvcmxkKCk7XHJcbiAgY3dfcmVzZXRQb3B1bGF0aW9uVUkoKTtcclxuXHJcbiAgTWF0aC5zZWVkcmFuZG9tKCk7XHJcbiAgY3dfZ2VuZXJhdGlvblplcm8oKTtcclxuICBjdXJyZW50UnVubmVyID0gd29ybGRSdW4oXHJcbiAgICB3b3JsZF9kZWYsIGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uLCB1aUxpc3RlbmVyc1xyXG4gICk7XHJcblxyXG4gIGdob3N0ID0gZ2hvc3RfY3JlYXRlX2dob3N0KCk7XHJcbiAgcmVzZXRDYXJVSSgpO1xyXG4gIHNldHVwQ2FyVUkoKVxyXG4gIGN3X2RyYXdNaW5pTWFwKCk7XHJcblxyXG4gIGN3X3N0YXJ0U2ltdWxhdGlvbigpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXR1cENhclVJKCl7XHJcbiAgY3VycmVudFJ1bm5lci5jYXJzLm1hcChmdW5jdGlvbihjYXJJbmZvKXtcclxuICAgIHZhciBjYXIgPSBuZXcgY3dfQ2FyKGNhckluZm8sIGNhck1hcCk7XHJcbiAgICBjYXJNYXAuc2V0KGNhckluZm8sIGNhcik7XHJcbiAgICBjYXIucmVwbGF5ID0gZ2hvc3RfY3JlYXRlX3JlcGxheSgpO1xyXG4gICAgZ2hvc3RfYWRkX3JlcGxheV9mcmFtZShjYXIucmVwbGF5LCBjYXIuY2FyLmNhcik7XHJcbiAgfSlcclxufVxyXG5cclxuXHJcbmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZmFzdC1mb3J3YXJkXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xyXG4gIGZhc3RGb3J3YXJkKClcclxufSk7XHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3NhdmUtcHJvZ3Jlc3NcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XHJcbiAgc2F2ZVByb2dyZXNzKClcclxufSk7XHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3Jlc3RvcmUtcHJvZ3Jlc3NcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XHJcbiAgcmVzdG9yZVByb2dyZXNzKClcclxufSk7XHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3RvZ2dsZS1kaXNwbGF5XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xyXG4gIHRvZ2dsZURpc3BsYXkoKVxyXG59KVxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNuZXctcG9wdWxhdGlvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcclxuICBjd19yZXNldFBvcHVsYXRpb25VSSgpXHJcbiAgY3dfZ2VuZXJhdGlvblplcm8oKTtcclxuICBnaG9zdCA9IGdob3N0X2NyZWF0ZV9naG9zdCgpO1xyXG4gIHJlc2V0Q2FyVUkoKTtcclxufSlcclxuXHJcbmZ1bmN0aW9uIHNhdmVQcm9ncmVzcygpIHtcclxuICBsb2NhbFN0b3JhZ2UuY3dfc2F2ZWRHZW5lcmF0aW9uID0gSlNPTi5zdHJpbmdpZnkoZ2VuZXJhdGlvblN0YXRlLmdlbmVyYXRpb24pO1xyXG4gIGxvY2FsU3RvcmFnZS5jd19nZW5Db3VudGVyID0gZ2VuZXJhdGlvblN0YXRlLmNvdW50ZXI7XHJcbiAgbG9jYWxTdG9yYWdlLmN3X2dob3N0ID0gSlNPTi5zdHJpbmdpZnkoZ2hvc3QpO1xyXG4gIGxvY2FsU3RvcmFnZS5jd190b3BTY29yZXMgPSBKU09OLnN0cmluZ2lmeShncmFwaFN0YXRlLmN3X3RvcFNjb3Jlcyk7XHJcbiAgbG9jYWxTdG9yYWdlLmN3X2Zsb29yU2VlZCA9IHdvcmxkX2RlZi5mbG9vcnNlZWQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlc3RvcmVQcm9ncmVzcygpIHtcclxuICBpZiAodHlwZW9mIGxvY2FsU3RvcmFnZS5jd19zYXZlZEdlbmVyYXRpb24gPT0gJ3VuZGVmaW5lZCcgfHwgbG9jYWxTdG9yYWdlLmN3X3NhdmVkR2VuZXJhdGlvbiA9PSBudWxsKSB7XHJcbiAgICBhbGVydChcIk5vIHNhdmVkIHByb2dyZXNzIGZvdW5kXCIpO1xyXG4gICAgcmV0dXJuO1xyXG4gIH1cclxuICBjd19zdG9wU2ltdWxhdGlvbigpO1xyXG4gIGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuY3dfc2F2ZWRHZW5lcmF0aW9uKTtcclxuICBnZW5lcmF0aW9uU3RhdGUuY291bnRlciA9IGxvY2FsU3RvcmFnZS5jd19nZW5Db3VudGVyO1xyXG4gIGdob3N0ID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuY3dfZ2hvc3QpO1xyXG4gIGdyYXBoU3RhdGUuY3dfdG9wU2NvcmVzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuY3dfdG9wU2NvcmVzKTtcclxuICB3b3JsZF9kZWYuZmxvb3JzZWVkID0gbG9jYWxTdG9yYWdlLmN3X2Zsb29yU2VlZDtcclxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIm5ld3NlZWRcIikudmFsdWUgPSB3b3JsZF9kZWYuZmxvb3JzZWVkO1xyXG5cclxuICBjdXJyZW50UnVubmVyID0gd29ybGRSdW4od29ybGRfZGVmLCBnZW5lcmF0aW9uU3RhdGUuZ2VuZXJhdGlvbiwgdWlMaXN0ZW5lcnMpO1xyXG4gIGN3X2RyYXdNaW5pTWFwKCk7XHJcbiAgTWF0aC5zZWVkcmFuZG9tKCk7XHJcblxyXG4gIHJlc2V0Q2FyVUkoKTtcclxuICBjd19zdGFydFNpbXVsYXRpb24oKTtcclxufVxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNjb25maXJtLXJlc2V0XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBmdW5jdGlvbigpe1xyXG4gIGN3X2NvbmZpcm1SZXNldFdvcmxkKClcclxufSlcclxuXHJcbmZ1bmN0aW9uIGN3X2NvbmZpcm1SZXNldFdvcmxkKCkge1xyXG4gIGlmIChjb25maXJtKCdSZWFsbHkgcmVzZXQgd29ybGQ/JykpIHtcclxuICAgIGN3X3Jlc2V0V29ybGQoKTtcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxufVxyXG5cclxuLy8gZ2hvc3QgcmVwbGF5IHN0dWZmXHJcblxyXG5cclxuZnVuY3Rpb24gY3dfcGF1c2VTaW11bGF0aW9uKCkge1xyXG4gIGN3X3BhdXNlZCA9IHRydWU7XHJcbiAgZ2hvc3RfcGF1c2UoZ2hvc3QpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19yZXN1bWVTaW11bGF0aW9uKCkge1xyXG4gIGN3X3BhdXNlZCA9IGZhbHNlO1xyXG4gIGdob3N0X3Jlc3VtZShnaG9zdCk7XHJcbiAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lTG9vcCk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3N0YXJ0R2hvc3RSZXBsYXkoKSB7XHJcbiAgaWYgKCFkb0RyYXcpIHtcclxuICAgIHRvZ2dsZURpc3BsYXkoKTtcclxuICB9XHJcbiAgY3dfcGF1c2VTaW11bGF0aW9uKCk7XHJcbiAgY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCA9IHNldEludGVydmFsKGN3X2RyYXdHaG9zdFJlcGxheSwgTWF0aC5yb3VuZCgxMDAwIC8gc2NyZWVuZnBzKSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3N0b3BHaG9zdFJlcGxheSgpIHtcclxuICBjbGVhckludGVydmFsKGN3X2dob3N0UmVwbGF5SW50ZXJ2YWwpO1xyXG4gIGN3X2dob3N0UmVwbGF5SW50ZXJ2YWwgPSBudWxsO1xyXG4gIGN3X2ZpbmRMZWFkZXIoKTtcclxuICBjYW1lcmEucG9zLnggPSBsZWFkZXJQb3NpdGlvbi54O1xyXG4gIGNhbWVyYS5wb3MueSA9IGxlYWRlclBvc2l0aW9uLnk7XHJcbiAgY3dfcmVzdW1lU2ltdWxhdGlvbigpO1xyXG59XHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI3RvZ2dsZS1naG9zdFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oZSl7XHJcbiAgY3dfdG9nZ2xlR2hvc3RSZXBsYXkoZS50YXJnZXQpXHJcbn0pXHJcblxyXG5mdW5jdGlvbiBjd190b2dnbGVHaG9zdFJlcGxheShidXR0b24pIHtcclxuICBpZiAoY3dfZ2hvc3RSZXBsYXlJbnRlcnZhbCA9PSBudWxsKSB7XHJcbiAgICBjd19zdGFydEdob3N0UmVwbGF5KCk7XHJcbiAgICBidXR0b24udmFsdWUgPSBcIlJlc3VtZSBzaW11bGF0aW9uXCI7XHJcbiAgfSBlbHNlIHtcclxuICAgIGN3X3N0b3BHaG9zdFJlcGxheSgpO1xyXG4gICAgYnV0dG9uLnZhbHVlID0gXCJWaWV3IHRvcCByZXBsYXlcIjtcclxuICB9XHJcbn1cclxuLy8gZ2hvc3QgcmVwbGF5IHN0dWZmIEVORFxyXG5cclxuLy8gaW5pdGlhbCBzdHVmZiwgb25seSBjYWxsZWQgb25jZSAoaG9wZWZ1bGx5KVxyXG5mdW5jdGlvbiBjd19pbml0KCkge1xyXG4gIC8vIGNsb25lIHNpbHZlciBkb3QgYW5kIGhlYWx0aCBiYXJcclxuICB2YXIgbW1tID0gZG9jdW1lbnQuZ2V0RWxlbWVudHNCeU5hbWUoJ21pbmltYXBtYXJrZXInKVswXTtcclxuICB2YXIgaGJhciA9IGRvY3VtZW50LmdldEVsZW1lbnRzQnlOYW1lKCdoZWFsdGhiYXInKVswXTtcclxuICB2YXIgZ2VuZXJhdGlvblNpemUgPSBnZW5lcmF0aW9uQ29uZmlnLmNvbnN0YW50cy5nZW5lcmF0aW9uU2l6ZTtcclxuXHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XHJcblxyXG4gICAgLy8gbWluaW1hcCBtYXJrZXJzXHJcbiAgICB2YXIgbmV3YmFyID0gbW1tLmNsb25lTm9kZSh0cnVlKTtcclxuICAgIG5ld2Jhci5pZCA9IFwiYmFyXCIgKyBrO1xyXG4gICAgbmV3YmFyLnN0eWxlLnBhZGRpbmdUb3AgPSBrICogOSArIFwicHhcIjtcclxuICAgIG1pbmltYXBob2xkZXIuYXBwZW5kQ2hpbGQobmV3YmFyKTtcclxuXHJcbiAgICAvLyBoZWFsdGggYmFyc1xyXG4gICAgdmFyIG5ld2hlYWx0aCA9IGhiYXIuY2xvbmVOb2RlKHRydWUpO1xyXG4gICAgbmV3aGVhbHRoLmdldEVsZW1lbnRzQnlUYWdOYW1lKFwiRElWXCIpWzBdLmlkID0gXCJoZWFsdGhcIiArIGs7XHJcbiAgICBuZXdoZWFsdGguY2FyX2luZGV4ID0gaztcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiaGVhbHRoXCIpLmFwcGVuZENoaWxkKG5ld2hlYWx0aCk7XHJcbiAgfVxyXG4gIG1tbS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKG1tbSk7XHJcbiAgaGJhci5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGhiYXIpO1xyXG4gIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBidG9hKE1hdGguc2VlZHJhbmRvbSgpKTtcclxuICBjd19nZW5lcmF0aW9uWmVybygpO1xyXG4gIGdob3N0ID0gZ2hvc3RfY3JlYXRlX2dob3N0KCk7XHJcbiAgcmVzZXRDYXJVSSgpO1xyXG4gIGN1cnJlbnRSdW5uZXIgPSB3b3JsZFJ1bih3b3JsZF9kZWYsIGdlbmVyYXRpb25TdGF0ZS5nZW5lcmF0aW9uLCB1aUxpc3RlbmVycyk7XHJcbiAgc2V0dXBDYXJVSSgpO1xyXG4gIGN3X2RyYXdNaW5pTWFwKCk7XHJcbiAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShnYW1lTG9vcCk7XHJcbiAgXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlbE1vdXNlQ29vcmRzKGV2ZW50KSB7XHJcbiAgdmFyIHRvdGFsT2Zmc2V0WCA9IDA7XHJcbiAgdmFyIHRvdGFsT2Zmc2V0WSA9IDA7XHJcbiAgdmFyIGNhbnZhc1ggPSAwO1xyXG4gIHZhciBjYW52YXNZID0gMDtcclxuICB2YXIgY3VycmVudEVsZW1lbnQgPSB0aGlzO1xyXG5cclxuICBkbyB7XHJcbiAgICB0b3RhbE9mZnNldFggKz0gY3VycmVudEVsZW1lbnQub2Zmc2V0TGVmdCAtIGN1cnJlbnRFbGVtZW50LnNjcm9sbExlZnQ7XHJcbiAgICB0b3RhbE9mZnNldFkgKz0gY3VycmVudEVsZW1lbnQub2Zmc2V0VG9wIC0gY3VycmVudEVsZW1lbnQuc2Nyb2xsVG9wO1xyXG4gICAgY3VycmVudEVsZW1lbnQgPSBjdXJyZW50RWxlbWVudC5vZmZzZXRQYXJlbnRcclxuICB9XHJcbiAgd2hpbGUgKGN1cnJlbnRFbGVtZW50KTtcclxuXHJcbiAgY2FudmFzWCA9IGV2ZW50LnBhZ2VYIC0gdG90YWxPZmZzZXRYO1xyXG4gIGNhbnZhc1kgPSBldmVudC5wYWdlWSAtIHRvdGFsT2Zmc2V0WTtcclxuXHJcbiAgcmV0dXJuIHt4OiBjYW52YXNYLCB5OiBjYW52YXNZfVxyXG59XHJcbkhUTUxEaXZFbGVtZW50LnByb3RvdHlwZS5yZWxNb3VzZUNvb3JkcyA9IHJlbE1vdXNlQ29vcmRzO1xyXG5taW5pbWFwaG9sZGVyLm9uY2xpY2sgPSBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICB2YXIgY29vcmRzID0gbWluaW1hcGhvbGRlci5yZWxNb3VzZUNvb3JkcyhldmVudCk7XHJcbiAgdmFyIGN3X2NhckFycmF5ID0gQXJyYXkuZnJvbShjYXJNYXAudmFsdWVzKCkpO1xyXG4gIHZhciBjbG9zZXN0ID0ge1xyXG4gICAgdmFsdWU6IGN3X2NhckFycmF5WzBdLmNhcixcclxuICAgIGRpc3Q6IE1hdGguYWJzKCgoY3dfY2FyQXJyYXlbMF0uZ2V0UG9zaXRpb24oKS54ICsgNikgKiBtaW5pbWFwc2NhbGUpIC0gY29vcmRzLngpLFxyXG4gICAgeDogY3dfY2FyQXJyYXlbMF0uZ2V0UG9zaXRpb24oKS54XHJcbiAgfVxyXG5cclxuICB2YXIgbWF4WCA9IDA7XHJcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjd19jYXJBcnJheS5sZW5ndGg7IGkrKykge1xyXG4gICAgdmFyIHBvcyA9IGN3X2NhckFycmF5W2ldLmdldFBvc2l0aW9uKCk7XHJcbiAgICB2YXIgZGlzdCA9IE1hdGguYWJzKCgocG9zLnggKyA2KSAqIG1pbmltYXBzY2FsZSkgLSBjb29yZHMueCk7XHJcbiAgICBpZiAoZGlzdCA8IGNsb3Nlc3QuZGlzdCkge1xyXG4gICAgICBjbG9zZXN0LnZhbHVlID0gY3dfY2FyQXJyYXkuY2FyO1xyXG4gICAgICBjbG9zZXN0LmRpc3QgPSBkaXN0O1xyXG4gICAgICBjbG9zZXN0LnggPSBwb3MueDtcclxuICAgIH1cclxuICAgIG1heFggPSBNYXRoLm1heChwb3MueCwgbWF4WCk7XHJcbiAgfVxyXG5cclxuICBpZiAoY2xvc2VzdC54ID09IG1heFgpIHsgLy8gZm9jdXMgb24gbGVhZGVyIGFnYWluXHJcbiAgICBjd19zZXRDYW1lcmFUYXJnZXQoLTEpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICBjd19zZXRDYW1lcmFUYXJnZXQoY2xvc2VzdC52YWx1ZSk7XHJcbiAgfVxyXG59XHJcblxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNtdXRhdGlvbnJhdGVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNoYW5nZVwiLCBmdW5jdGlvbihlKXtcclxuICB2YXIgZWxlbSA9IGUudGFyZ2V0XHJcbiAgY3dfc2V0TXV0YXRpb24oZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXHJcbn0pXHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI211dGF0aW9uc2l6ZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xyXG4gIHZhciBlbGVtID0gZS50YXJnZXRcclxuICBjd19zZXRNdXRhdGlvblJhbmdlKGVsZW0ub3B0aW9uc1tlbGVtLnNlbGVjdGVkSW5kZXhdLnZhbHVlKVxyXG59KVxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNmbG9vclwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xyXG4gIHZhciBlbGVtID0gZS50YXJnZXRcclxuICBjd19zZXRNdXRhYmxlRmxvb3IoZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXHJcbn0pO1xyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNncmF2aXR5XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjaGFuZ2VcIiwgZnVuY3Rpb24oZSl7XHJcbiAgdmFyIGVsZW0gPSBlLnRhcmdldFxyXG4gIGN3X3NldEdyYXZpdHkoZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXHJcbn0pXHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2VsaXRlc2l6ZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2hhbmdlXCIsIGZ1bmN0aW9uKGUpe1xyXG4gIHZhciBlbGVtID0gZS50YXJnZXRcclxuICBjd19zZXRFbGl0ZVNpemUoZWxlbS5vcHRpb25zW2VsZW0uc2VsZWN0ZWRJbmRleF0udmFsdWUpXHJcbn0pXHJcblxyXG5mdW5jdGlvbiBjd19zZXRNdXRhdGlvbihtdXRhdGlvbikge1xyXG4gIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmdlbl9tdXRhdGlvbiA9IHBhcnNlRmxvYXQobXV0YXRpb24pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19zZXRNdXRhdGlvblJhbmdlKHJhbmdlKSB7XHJcbiAgZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMubXV0YXRpb25fcmFuZ2UgPSBwYXJzZUZsb2F0KHJhbmdlKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc2V0TXV0YWJsZUZsb29yKGNob2ljZSkge1xyXG4gIHdvcmxkX2RlZi5tdXRhYmxlX2Zsb29yID0gKGNob2ljZSA9PSAxKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc2V0R3Jhdml0eShjaG9pY2UpIHtcclxuICB3b3JsZF9kZWYuZ3Jhdml0eSA9IG5ldyBiMlZlYzIoMC4wLCAtcGFyc2VGbG9hdChjaG9pY2UpKTtcclxuICB2YXIgd29ybGQgPSBjdXJyZW50UnVubmVyLnNjZW5lLndvcmxkXHJcbiAgLy8gQ0hFQ0sgR1JBVklUWSBDSEFOR0VTXHJcbiAgaWYgKHdvcmxkLkdldEdyYXZpdHkoKS55ICE9IHdvcmxkX2RlZi5ncmF2aXR5LnkpIHtcclxuICAgIHdvcmxkLlNldEdyYXZpdHkod29ybGRfZGVmLmdyYXZpdHkpO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gY3dfc2V0RWxpdGVTaXplKGNsb25lcykge1xyXG4gIGdlbmVyYXRpb25Db25maWcuY29uc3RhbnRzLmNoYW1waW9uTGVuZ3RoID0gcGFyc2VJbnQoY2xvbmVzLCAxMCk7XHJcbn1cclxuXHJcbmN3X2luaXQoKTtcclxuIiwidmFyIHJhbmRvbSA9IHJlcXVpcmUoXCIuL3JhbmRvbS5qc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIGNyZWF0ZUdlbmVyYXRpb25aZXJvKHNjaGVtYSwgZ2VuZXJhdG9yKXtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoZnVuY3Rpb24oaW5zdGFuY2UsIGtleSl7XG4gICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xuICAgICAgdmFyIHZhbHVlcyA9IHJhbmRvbS5jcmVhdGVOb3JtYWxzKHNjaGVtYVByb3AsIGdlbmVyYXRvcik7XG4gICAgICBpbnN0YW5jZVtrZXldID0gdmFsdWVzO1xuICAgICAgcmV0dXJuIGluc3RhbmNlO1xuICAgIH0sIHsgaWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpIH0pO1xuICB9LFxuICBjcmVhdGVDcm9zc0JyZWVkKHNjaGVtYSwgcGFyZW50cywgcGFyZW50Q2hvb3Nlcil7XG4gICAgdmFyIGlkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzMik7XG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGNyb3NzRGVmLCBrZXkpe1xuICAgICAgdmFyIHNjaGVtYURlZiA9IHNjaGVtYVtrZXldO1xuICAgICAgdmFyIHZhbHVlcyA9IFtdO1xuICAgICAgZm9yKHZhciBpID0gMCwgbCA9IHNjaGVtYURlZi5sZW5ndGg7IGkgPCBsOyBpKyspe1xuICAgICAgICB2YXIgcCA9IHBhcmVudENob29zZXIoaWQsIGtleSwgcGFyZW50cyk7XG4gICAgICAgIHZhbHVlcy5wdXNoKHBhcmVudHNbcF1ba2V5XVtpXSk7XG4gICAgICB9XG4gICAgICBjcm9zc0RlZltrZXldID0gdmFsdWVzO1xuICAgICAgcmV0dXJuIGNyb3NzRGVmO1xuICAgIH0sIHtcbiAgICAgIGlkOiBpZCxcbiAgICAgIGFuY2VzdHJ5OiBwYXJlbnRzLm1hcChmdW5jdGlvbihwYXJlbnQpe1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGlkOiBwYXJlbnQuaWQsXG4gICAgICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeSxcbiAgICAgICAgfTtcbiAgICAgIH0pXG4gICAgfSk7XG4gIH0sXG4gIGNyZWF0ZU11dGF0ZWRDbG9uZShzY2hlbWEsIGdlbmVyYXRvciwgcGFyZW50LCBmYWN0b3IsIGNoYW5jZVRvTXV0YXRlKXtcbiAgICByZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoZnVuY3Rpb24oY2xvbmUsIGtleSl7XG4gICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xuICAgICAgdmFyIG9yaWdpbmFsVmFsdWVzID0gcGFyZW50W2tleV07XG4gICAgICB2YXIgdmFsdWVzID0gcmFuZG9tLm11dGF0ZU5vcm1hbHMoXG4gICAgICAgIHNjaGVtYVByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIGZhY3RvciwgY2hhbmNlVG9NdXRhdGVcbiAgICAgICk7XG4gICAgICBjbG9uZVtrZXldID0gdmFsdWVzO1xuICAgICAgcmV0dXJuIGNsb25lO1xuICAgIH0sIHtcbiAgICAgIGlkOiBwYXJlbnQuaWQsXG4gICAgICBhbmNlc3RyeTogcGFyZW50LmFuY2VzdHJ5XG4gICAgfSk7XG4gIH0sXG4gIGFwcGx5VHlwZXMoc2NoZW1hLCBwYXJlbnQpe1xuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihjbG9uZSwga2V5KXtcbiAgICAgIHZhciBzY2hlbWFQcm9wID0gc2NoZW1hW2tleV07XG4gICAgICB2YXIgb3JpZ2luYWxWYWx1ZXMgPSBwYXJlbnRba2V5XTtcbiAgICAgIHZhciB2YWx1ZXM7XG4gICAgICBzd2l0Y2goc2NoZW1hUHJvcC50eXBlKXtcbiAgICAgICAgY2FzZSBcInNodWZmbGVcIiA6XG4gICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvU2h1ZmZsZShzY2hlbWFQcm9wLCBvcmlnaW5hbFZhbHVlcyk7IGJyZWFrO1xuICAgICAgICBjYXNlIFwiZmxvYXRcIiA6XG4gICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvRmxvYXQoc2NoZW1hUHJvcCwgb3JpZ2luYWxWYWx1ZXMpOyBicmVhaztcbiAgICAgICAgY2FzZSBcImludGVnZXJcIjpcbiAgICAgICAgICB2YWx1ZXMgPSByYW5kb20ubWFwVG9JbnRlZ2VyKHNjaGVtYVByb3AsIG9yaWdpbmFsVmFsdWVzKTsgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHR5cGUgJHtzY2hlbWFQcm9wLnR5cGV9IG9mIHNjaGVtYSBmb3Iga2V5ICR7a2V5fWApO1xuICAgICAgfVxuICAgICAgY2xvbmVba2V5XSA9IHZhbHVlcztcbiAgICAgIHJldHVybiBjbG9uZTtcbiAgICB9LCB7XG4gICAgICBpZDogcGFyZW50LmlkLFxuICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeVxuICAgIH0pO1xuICB9LFxufVxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0Y3JlYXRlRGF0YVBvaW50Q2x1c3RlcjogY3JlYXRlRGF0YVBvaW50Q2x1c3RlcixcclxuXHRjcmVhdGVEYXRhUG9pbnQ6IGNyZWF0ZURhdGFQb2ludCxcclxuXHRjcmVhdGVDbHVzdGVySW50ZXJmYWNlOiBjcmVhdGVDbHVzdGVySW50ZXJmYWNlLFxyXG5cdGZpbmREYXRhUG9pbnRDbHVzdGVyOiBmaW5kRGF0YVBvaW50Q2x1c3RlcixcclxuXHRmaW5kRGF0YVBvaW50OiBmaW5kRGF0YVBvaW50LFxyXG5cdHNvcnRDbHVzdGVyOiBzb3J0Q2x1c3RlcixcclxuXHRmaW5kT2plY3ROZWlnaGJvcnM6IGZpbmRPamVjdE5laWdoYm9ycyxcclxuXHRzY29yZU9iamVjdDogc2NvcmVPYmplY3QsXHJcblx0Y3JlYXRlU3ViRGF0YVBvaW50Q2x1c3RlcjpjcmVhdGVTdWJEYXRhUG9pbnRDbHVzdGVyXHJcblx0XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZURhdGFQb2ludENsdXN0ZXIoY2FyRGF0YVBvaW50VHlwZSl7XHJcblx0dmFyIGNsdXN0ZXIgPSB7XHJcblx0XHRpZDogY2FyRGF0YVBvaW50VHlwZSxcclxuXHRcdGRhdGFBcnJheTogbmV3IEFycmF5KClcclxuXHR9O1xyXG5cdHJldHVybiBjbHVzdGVyO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVTdWJEYXRhUG9pbnRDbHVzdGVyKGNhckRhdGFQb2ludFR5cGUpe1xyXG5cdHZhciBjbHVzdGVyID0ge1xyXG5cdFx0aWQ6IGNhckRhdGFQb2ludFR5cGUsXHJcblx0XHRkYXRhQXJyYXk6IG5ldyBBcnJheSgpXHJcblx0fTtcclxuXHRyZXR1cm4gY2x1c3RlcjtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlRGF0YVBvaW50KGRhdGFJZCwgZGF0YVBvaW50VHlwZSwgZCwgcyl7XHJcblx0dmFyIGRhdGFQb2ludCA9IHtcclxuXHRcdGlkOiBkYXRhSWQsXHJcblx0XHR0eXBlOiBkYXRhUG9pbnRUeXBlLFxyXG5cdFx0ZGF0YTogZCxcclxuXHRcdHNjb3JlOiBzXHJcblx0fTtcclxuXHRyZXR1cm4gZGF0YVBvaW50O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVDbHVzdGVySW50ZXJmYWNlKGlkKXtcclxuXHR2YXIgY2x1c3RlciA9IHtcclxuXHRcdGNhcnNBcnJheTogbmV3IEFycmF5KCksXHJcblx0XHRjbHVzdGVySUQ6IGlkLFxyXG5cdFx0YXJyYXlPZkNsdXN0ZXJzOiBuZXcgQXJyYXkoKVxyXG5cdH07XHJcblx0cmV0dXJuIGNsdXN0ZXI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNvcnRDbHVzdGVyKGNsdXN0ZXIpe1xyXG5cdGNsdXN0ZXIuc29ydChmdW5jdGlvbihhLCBiKXtyZXR1cm4gYS5kYXRhIC0gYi5kYXRhfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbmRPamVjdE5laWdoYm9ycyhkYXRhSWQsIGNsdXN0ZXIsIHJhbmdlKSB7XHJcblx0dmFyIG5laWdoYm9ycyA9IG5ldyBBcnJheSgpO1xyXG5cdHZhciBpbmRleCA9IGNsdXN0ZXIuZmluZEluZGV4KHg9PiB4LmlkPT09ZGF0YUlkKTtcclxuXHR2YXIgZ29uZVBhc3RJZCA9IGZhbHNlO1xyXG5cdHZhciBjbHVzdGVyTGVuZ3RoID0gY2x1c3Rlci5sZW5ndGg7XHJcblx0Zm9yKHZhciBpPTA7aTxyYW5nZTtpKyspe1xyXG5cdFx0aWYoKGluZGV4LXJhbmdlKTwwKXtcclxuXHRcdFx0aWYoY2x1c3RlcltpXS5pZD09PWRhdGFJZCl7Z29uZVBhc3RJZD10cnVlO31cclxuXHRcdFx0bmVpZ2hib3JzLnB1c2goKGdvbmVQYXN0SWQ9PT1mYWxzZSk/Y2x1c3RlcltpXTpjbHVzdGVyW2krMV0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZigoaW5kZXgrcmFuZ2UpPmNsdXN0ZXJMZW5ndGgpe1xyXG5cdFx0XHRpZihjbHVzdGVyWyhjbHVzdGVyTGVuZ3RoLTEpLWldLmlkPT09ZGF0YUlkKXtnb25lUGFzdElkPXRydWU7fVxyXG5cdFx0XHRuZWlnaGJvcnMucHVzaCgoZ29uZVBhc3RJZD09PWZhbHNlKT9jbHVzdGVyWyhjbHVzdGVyTGVuZ3RoLTEpLWldOmNsdXN0ZXJbKGNsdXN0ZXJMZW5ndGgtMSktKGkrMSldKTtcclxuXHRcdH1cclxuXHRcdGVsc2Uge1xyXG5cdFx0XHRpZihjbHVzdGVyW2luZGV4LShyYW5nZS8yKStpXS5pZD09PWRhdGFJZCl7Z29uZVBhc3RJZD10cnVlO31cclxuXHRcdFx0bmVpZ2hib3JzLnB1c2goKGdvbmVQYXN0SWQ9PT1mYWxzZSk/Y2x1c3RlcltpbmRleC0ocmFuZ2UvMikraV06Y2x1c3RlclsoaW5kZXgrMSktKHJhbmdlLzIpK2ldKTtcclxuXHRcdH1cclxuXHRcdFxyXG5cdH1cclxuXHRyZXR1cm4gbmVpZ2hib3JzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kRGF0YVBvaW50Q2x1c3RlcihkYXRhSWQsIGNsdXN0ZXIpe1xyXG5cdHJldHVybiBjbHVzdGVyLmFycmF5T2ZDbHVzdGVycy5maW5kKHg9PiB4LmlkPT09ZGF0YUlkKTtcclxufVxyXG5cclxuZnVuY3Rpb24gZmluZERhdGFQb2ludChkYXRhSWQsIGNsdXN0ZXIpe1xyXG5cdHJldHVybiBjbHVzdGVyLmRhdGFBcnJheS5maW5kKGZ1bmN0aW9uKHZhbHVlKXtcclxuXHRcdHJldHVybiB2YWx1ZS5pZD09PWlkO1xyXG5cdH0pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzY29yZU9iamVjdChpZCwgY2x1c3Rlcil7XHJcblx0dmFyIG5laWdoYm9ycyA9IGZpbmRPamVjdE5laWdoYm9ycyhpZCwgY2x1c3RlciwgKChjbHVzdGVyLmxlbmd0aC80KTw0MCk/Njo0MCk7XHJcblx0dmFyIG5ld1Njb3JlID0gMDtcclxuXHRmb3IodmFyIGk9MDtpPG5laWdoYm9ycy5sZW5ndGg7aSsrKXtcclxuXHRcdG5ld1Njb3JlKz1uZWlnaGJvcnNbaV0uc2NvcmU7XHJcblx0fVxyXG5cdHJldHVybiBuZXdTY29yZS9uZWlnaGJvcnMubGVuZ3RoO1xyXG59IiwidmFyIGNsdXN0ZXIgPSByZXF1aXJlKFwiLi9jbHVzdGVyLmpzL1wiKTtcclxuLy92YXIgY2FyT2JqZWN0cyA9IHJlcXVpcmUoXCIuL2Nhci1vYmplY3RzLmpzb25cIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRzZXR1cDogc2V0dXAsXHJcblx0cmVTY29yZUNhcnM6IHJlU2NvcmVDYXJzXHJcbn1cclxuXHJcbi8vXCJ3aGVlbF9yYWRpdXNcIiwgXCJjaGFzc2lzX2RlbnNpdHlcIiwgXCJ2ZXJ0ZXhfbGlzdFwiLCBcIndoZWVsX3ZlcnRleFwiIGFuZCBcIndoZWVsX2RlbnNpdHlcIi9cclxuZnVuY3Rpb24gc2V0dXAoY2FycywgZXh0Q2x1c3RlciwgY2x1c3RlclByZWNyZWF0ZWQpe1xyXG5cdHZhciBjbHVzdCA9IChjbHVzdGVyUHJlY3JlYXRlZD09PWZhbHNlKT9zZXR1cERhdGFDbHVzdGVycyhjbHVzdGVyLmNyZWF0ZUNsdXN0ZXJJbnRlcmZhY2UoXCJuZXdDbHVzdGVyXCIpKTogZXh0Q2x1c3RlcjtcclxuXHRmb3IodmFyIGkgPTA7aTxjYXJzLmxlbmd0aDtpKyspe1xyXG5cdFx0aWYoY2Fyc1tpXS5kZWYuZWxpdGU9PT1mYWxzZSl7XHJcblx0XHRcdGFkZENhcnNUb0NsdXN0ZXIoY2Fyc1tpXSwgY2x1c3QpO1xyXG5cdFx0XHRjbHVzdC5jYXJzQXJyYXkucHVzaChjYXJzW2ldKTtcclxuXHRcdH1cclxuXHR9XHJcblx0Y29uc29sZS5sb2coY2x1c3QpOy8vdGVzdFxyXG5cdHJldHVybiBjbHVzdDtcclxufVxyXG5cclxuZnVuY3Rpb24gc2V0dXBEYXRhQ2x1c3RlcnMobWFpbkNsdXN0ZXIpe1xyXG5cdG1haW5DbHVzdGVyLmFycmF5T2ZDbHVzdGVycy5wdXNoKGNsdXN0ZXIuY3JlYXRlRGF0YVBvaW50Q2x1c3RlcihcIndoZWVsX3JhZGl1c1wiKSk7XHJcblx0bWFpbkNsdXN0ZXIuYXJyYXlPZkNsdXN0ZXJzLnB1c2goY2x1c3Rlci5jcmVhdGVEYXRhUG9pbnRDbHVzdGVyKFwiY2hhc3Npc19kZW5zaXR5XCIpKTtcclxuXHRtYWluQ2x1c3Rlci5hcnJheU9mQ2x1c3RlcnMucHVzaChjbHVzdGVyLmNyZWF0ZURhdGFQb2ludENsdXN0ZXIoXCJ3aGVlbF92ZXJ0ZXhcIikpO1xyXG5cdG1haW5DbHVzdGVyLmFycmF5T2ZDbHVzdGVycy5wdXNoKGNsdXN0ZXIuY3JlYXRlRGF0YVBvaW50Q2x1c3RlcihcInZlcnRleF9saXN0XCIpKTtcclxuXHRtYWluQ2x1c3Rlci5hcnJheU9mQ2x1c3RlcnMucHVzaChjbHVzdGVyLmNyZWF0ZURhdGFQb2ludENsdXN0ZXIoXCJ3aGVlbF9kZW5zaXR5XCIpKTtcclxuXHRyZXR1cm4gbWFpbkNsdXN0ZXI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFkZENhcnNUb0NsdXN0ZXIoY2FyLCBjbHVzdCl7XHJcblx0YWRkRGF0YVRvQ2x1c3RlcihjYXIuZGVmLmlkLCBjYXIuZGVmLndoZWVsX3JhZGl1cyxjYXIuc2NvcmUucywgY2x1c3Rlci5maW5kRGF0YVBvaW50Q2x1c3RlcihcIndoZWVsX3JhZGl1c1wiLCBjbHVzdCkpO1xyXG4gICAgYWRkRGF0YVRvQ2x1c3RlcihjYXIuZGVmLmlkLCBjYXIuZGVmLmNoYXNzaXNfZGVuc2l0eSxjYXIuc2NvcmUucywgY2x1c3Rlci5maW5kRGF0YVBvaW50Q2x1c3RlcihcImNoYXNzaXNfZGVuc2l0eVwiLCBjbHVzdCkpO1xyXG5cdGFkZERhdGFUb0NsdXN0ZXIoY2FyLmRlZi5pZCwgY2FyLmRlZi52ZXJ0ZXhfbGlzdCxjYXIuc2NvcmUucywgY2x1c3Rlci5maW5kRGF0YVBvaW50Q2x1c3RlcihcInZlcnRleF9saXN0XCIsIGNsdXN0KSk7XHJcblx0YWRkRGF0YVRvQ2x1c3RlcihjYXIuZGVmLmlkLCBjYXIuZGVmLndoZWVsX3ZlcnRleCxjYXIuc2NvcmUucywgY2x1c3Rlci5maW5kRGF0YVBvaW50Q2x1c3RlcihcIndoZWVsX3ZlcnRleFwiLCBjbHVzdCkpO1xyXG5cdGFkZERhdGFUb0NsdXN0ZXIoY2FyLmRlZi5pZCwgY2FyLmRlZi53aGVlbF9kZW5zaXR5LGNhci5zY29yZS5zLCBjbHVzdGVyLmZpbmREYXRhUG9pbnRDbHVzdGVyKFwid2hlZWxfZGVuc2l0eVwiLCBjbHVzdCkpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBhZGREYXRhVG9DbHVzdGVyKGlkLCBjYXJEYXRhLCBzY29yZSwgY2x1c3Qpe1xyXG5cdGlmKGNsdXN0LmRhdGFBcnJheS5sZW5ndGg9PT1jYXJEYXRhLmxlbmd0aCl7XHJcblx0XHRmb3IodmFyIHg9MDt4PGNhckRhdGEubGVuZ3RoO3grKyl7XHJcblx0XHRcdGNsdXN0LmRhdGFBcnJheVt4XS5kYXRhQXJyYXkucHVzaChjbHVzdGVyLmNyZWF0ZURhdGFQb2ludChpZCwgXCJcIiwgY2FyRGF0YVt4XSwgc2NvcmUpKTtcclxuXHRcdFx0Y2x1c3Rlci5zb3J0Q2x1c3RlcihjbHVzdC5kYXRhQXJyYXlbeF0uZGF0YUFycmF5KTtcclxuXHRcdH1cclxuXHR9XHJcblx0ZWxzZSB7XHJcblx0XHRmb3IodmFyIGk9MDtpPGNhckRhdGEubGVuZ3RoO2krKyl7XHJcblx0XHRcdHZhciBuZXdDbHVzdCA9IGNsdXN0ZXIuY3JlYXRlU3ViRGF0YVBvaW50Q2x1c3RlcihcIlwiKTtcclxuXHRcdFx0bmV3Q2x1c3QuZGF0YUFycmF5LnB1c2goY2x1c3Rlci5jcmVhdGVEYXRhUG9pbnQoaWQsIFwiXCIsIGNhckRhdGFbaV0sIHNjb3JlKSk7XHJcblx0XHRcdGNsdXN0LmRhdGFBcnJheS5wdXNoKG5ld0NsdXN0KTtcclxuXHRcdH1cclxuXHR9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHJlU2NvcmVDYXJzKGNhcnMsIGNsdXN0KXtcclxuXHRmb3IodmFyIGk9MDtpPGNhcnMubGVuZ3RoO2krKyl7XHJcblx0XHR2YXIgc2NvcmUgPSAwO1xyXG5cdFx0Zm9yKHZhciB4PTA7eDxjbHVzdC5hcnJheU9mQ2x1c3RlcnMubGVuZ3RoO3grKyl7XHJcblx0XHRcdGZvcih2YXIgeT0wO3k8Y2x1c3QuYXJyYXlPZkNsdXN0ZXJzW3hdLmRhdGFBcnJheS5sZW5ndGg7eSsrKXtcclxuXHRcdFx0XHRzY29yZSArPSBjbHVzdGVyLnNjb3JlT2JqZWN0KGNhcnNbaV0uZGVmLmlkLCBjbHVzdC5hcnJheU9mQ2x1c3RlcnNbeF0uZGF0YUFycmF5W3ldLmRhdGFBcnJheSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGNhcnNbaV0uc2NvcmUucyArPSBzY29yZS9jbHVzdC5hcnJheU9mQ2x1c3RlcnMubGVuZ3RoO1xyXG5cdH1cclxufVxyXG5cclxuIiwiLyp2YXIgcmFuZG9tSW50ID0gcmVxdWlyZShcIi4vcmFuZG9tSW50LmpzL1wiKTtcclxudmFyIGdldFJhbmRvbUludCA9IHJhbmRvbUludC5nZXRSYW5kb21JbnQ7Ki9cclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdHJ1bkNyb3Nzb3ZlcjogcnVuQ3Jvc3NvdmVyXHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiBjcmVhdGVzIHRoZSBhY3VhbCBuZXcgY2FyIGFuZCByZXR1cm5lZC4gVGhlIGZ1bmN0aW9uIHJ1bnMgYSBvbmUtcG9pbnQgY3Jvc3NvdmVyIHRha2luZyBkYXRhIGZyb20gdGhlIHBhcmVudHMgcGFzc2VkIHRocm91Z2ggYW5kIGFkZGluZyB0aGVtIHRvIHRoZSBuZXcgY2FyLlxyXG5AcGFyYW0gcGFyZW50cyBPYmplY3RBcnJheSAtIERhdGEgaXMgdGFrZW4gZnJvbSB0aGVzZSBjYXJzIGFuZCBhZGRlZCB0byB0aGUgbmV3IGNhciB1c2luZyBjcm9zc292ZXIuXHJcbkBwYXJhbSBzY2hlbWEgLSBUaGUgZGF0YSBvYmplY3RzIHRoYXQgY2FyIG9iamVjdHMgaGF2ZSBzdWNoIGFzIFwid2hlZWxfcmFkaXVzXCIsIFwiY2hhc3Npc19kZW5zaXR5XCIsIFwidmVydGV4X2xpc3RcIiwgXCJ3aGVlbF92ZXJ0ZXhcIiBhbmQgXCJ3aGVlbF9kZW5zaXR5XCJcclxuQHBhcmFtIG5vQ3Jvc3NvdmVyUG9pbnQgaW50IC0gVGhlIGZpcnN0IGNyb3Nzb3ZlciBwb2ludCByYW5kb21seSBnZW5lcmF0ZWRcclxuQHBhcmFtIG5vQ3Jvc3NvdmVyUG9pbnRUd28gaW50IC0gVGhlIHNlY29uZCBjcm9zc292ZXIgcG9pbnQgcmFuZG9tbHkgZ2VuZXJhdGVkIFxyXG5AcGFyYW0gY2FyTm8gaW50IC0gd2hldGhlciB0aGlzIGNhciBpcyB0aGUgZmlyc3Qgb3Igc2Vjb25kIGNoaWxkIGZvciB0aGUgcGFyZW50IGNhcnNcclxuQHBhcmFtIHBhcmVudFNjb3JlIGludCAtIFRoZSBhdmVyYWdlIHNjb3JlIG9mIHRoZSB0d28gcGFyZW50c1xyXG5AcGFyYW0gbm9DYXJzQ3JlYXRlZCBpbnQgLSBUaGUgbnVtYmVyIG9mIGNhcnMgY3JlYXRlZCBzbyBmYXIsIHVzZWQgZm9yIHRoZSBuZXcgY2FycyBpZFxyXG5AcGFyYW0gY3Jvc3NvdmVyVHlwZSBpbnQgLSBUaGUgdHlwZSBvZiBjcm9zc292ZXIgdG8gdXNlIHN1Y2ggYXMgMSBmb3IgT25lIHBvaW50IGNyb3Nzb3ZlciBhbnkgb3RoZXIgVHdvIHBvaW50IGNyb3Nzb3ZlclxyXG5AcmV0dXJuIGNhciBPYmplY3QgLSBBIGNhciBvYmplY3QgaXMgY3JlYXRlZCBhbmQgcmV0dXJuZWQqL1xyXG5mdW5jdGlvbiBjb21iaW5lRGF0YShwYXJlbnRzLCBzY2hlbWEsIG5vQ3Jvc3NvdmVyUG9pbnQsIG5vQ3Jvc3NvdmVyUG9pbnRUd28sIGNhck5vLCBwYXJlbnRTY29yZSxub0NhcnNDcmVhdGVkLCBjcm9zc292ZXJUeXBlKXtcclxuXHR2YXIgaWQgPSBub0NhcnNDcmVhdGVkK2Nhck5vO1xyXG5cdHZhciBrZXlJdGVyYXRpb24gPSAwO1xyXG5cdHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihjcm9zc0RlZiwga2V5KXtcclxuICAgICAgdmFyIHNjaGVtYURlZiA9IHNjaGVtYVtrZXldO1xyXG4gICAgICB2YXIgdmFsdWVzID0gW107XHJcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBzY2hlbWFEZWYubGVuZ3RoOyBpIDwgbDsgaSsrKXtcclxuICAgICAgICB2YXIgcCA9IGNyb3Nzb3ZlcihjYXJObywgbm9Dcm9zc292ZXJQb2ludCwgbm9Dcm9zc292ZXJQb2ludFR3bywga2V5SXRlcmF0aW9uLCBjcm9zc292ZXJUeXBlKTtcclxuICAgICAgICB2YWx1ZXMucHVzaChwYXJlbnRzW3BdW2tleV1baV0pO1xyXG4gICAgICB9XHJcbiAgICAgIGNyb3NzRGVmW2tleV0gPSB2YWx1ZXM7XHJcblx0ICBrZXlJdGVyYXRpb24rKztcclxuICAgICAgcmV0dXJuIGNyb3NzRGVmO1xyXG4gICAgfSAsIHtcclxuXHRcdGlkOiBpZCxcclxuXHRcdHBhcmVudHNTY29yZTogcGFyZW50U2NvcmVcclxuXHR9KTtcclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIGNob29zZXMgd2hpY2ggY2FyIHRoZSBkYXRhIGlzIHRha2VuIGZyb20gYmFzZWQgb24gdGhlIHBhcmFtZXRlcnMgZ2l2ZW4gdG8gdGhlIGZ1bmN0aW9uXHJcbkBwYXJhbSBjYXJObyBpbnQgLSBUaGlzIGlzIHRoZSBudW1iZXIgb2YgdGhlIGNhciBiZWluZyBjcmVhdGVkIGJldHdlZW4gMS0yLCBmaWx0ZXJzIGNhcnMgZGF0YSBpcyBiZWluZyB0YWtlblxyXG5AcGFyYW0gbm9Dcm9zc292ZXJQb2ludCBpbnQgLSBUaGUgZmlyc3QgY3Jvc3NvdmVyIHBvaW50IHdoZXJlIGRhdGEgYmVmb3JlIG9yIGFmdGVyIHRoZSBwb2ludCBpcyB0YWtlblxyXG5AcGFyYW0gbm9Dcm9zc292ZXJQb2ludFR3byBpbnQgLSBUaGUgc2Vjb25kIGNyb3Nzb3ZlciBwb2ludCB3aGVyZSBkYXRhIGlzIGJlZm9yZSBvciBhZnRlciB0aGUgcG9pbnQgaXMgdGFrZW5cclxuQHBhcmFtIGtleUl0ZXJhdGlvbiBpbnQgLSBUaGlzIGlzIHRoZSBwb2ludCBhdCB3aGljaCB0aGUgY3Jvc3NvdmVyIGlzIGN1cnJlbnRseSBhdCB3aGljaCBoZWxwIHNwZWNpZmllcyB3aGljaCBjYXJzIGRhdGEgaXMgcmVsYXZlbnQgdG8gdGFrZSBjb21wYXJpbmcgdGhpcyBwb2ludCB0byB0aGUgb25lL3R3byBjcm9zc292ZSBwb2ludHNcclxuQHBhcmFtIGNyb3Nzb3ZlVHlwZSBpbnQgLSBUaGlzIHNwZWNpZmllcyBpZiBvbmUgcG9pbnQoMSkgb3IgdHdvIHBvaW50IGNyb3Nzb3ZlcihhbnkgaW50KSBpcyB1c2VkXHJcbkByZXR1cm4gaW50IC0gV2hpY2ggcGFyZW50IGRhdGEgc2hvdWxkIGJlIHRha2VuIGZyb20gaXMgcmV0dXJuZWQgZWl0aGVyIDAgb3IgMSovXHJcbmZ1bmN0aW9uIGNyb3Nzb3ZlcihjYXJObywgbm9Dcm9zc292ZXJQb2ludCwgbm9Dcm9zc292ZXJQb2ludFR3byxrZXlJdGVyYXRpb24sY3Jvc3NvdmVyVHlwZSl7XHJcblx0aWYoY3Jvc3NvdmVyVHlwZT09PTEpeyAvL3J1biBvbmUtcG9pbnQgY3Jvc3NvdmVyXHJcblx0XHRyZXR1cm4gKGNhck5vPT09MSk/KGtleUl0ZXJhdGlvbj49bm9Dcm9zc292ZXJQb2ludCk/MDoxOihrZXlJdGVyYXRpb24+PW5vQ3Jvc3NvdmVyUG9pbnQpPzE6MDsvLyBoYW5kbGVzIHRoZSBmaXhlZCBvbmUtcG9pbnQgc3dpdGNoIG92ZXJcclxuXHR9XHJcblx0ZWxzZSB7IC8vcnVuIHR3by1wb2ludCBjcm9zc292ZXJcclxuXHRcdGlmKGNhck5vPT09MSl7XHJcblx0XHRcdGlmKCgoa2V5SXRlcmF0aW9uPm5vQ3Jvc3NvdmVyUG9pbnQpJiYoa2V5SXRlcmF0aW9uPG5vQ3Jvc3NvdmVyUG9pbnRUd28pKXx8KChrZXlJdGVyYXRpb24+bm9Dcm9zc292ZXJQb2ludFR3bykmJihrZXlJdGVyYXRpb248bm9Dcm9zc292ZXJQb2ludCkpKXtcclxuXHRcdFx0XHRyZXR1cm4gMDtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHsgcmV0dXJuIDE7fVxyXG5cdFx0fVxyXG5cdFx0ZWxzZXtcclxuXHRcdFx0aWYoKChrZXlJdGVyYXRpb24+bm9Dcm9zc292ZXJQb2ludCkmJihrZXlJdGVyYXRpb248bm9Dcm9zc292ZXJQb2ludFR3bykpfHwoKGtleUl0ZXJhdGlvbj5ub0Nyb3Nzb3ZlclBvaW50VHdvKSYmKGtleUl0ZXJhdGlvbjxub0Nyb3Nzb3ZlclBvaW50KSkpe1xyXG5cdFx0XHRcdHJldHVybiAxO1xyXG5cdFx0XHR9XHJcblx0XHRcdGVsc2UgeyByZXR1cm4gMDt9XHJcblx0XHR9XHJcblx0fVxyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gcmFuZG9tbHkgZ2VuZXJhdGVzIHR3byBjcm9zc292ZXIgcG9pbnRzIGFuZCBwYXNzZXMgdGhlbSB0byB0aGUgY3Jvc3NvdmVyIGZ1bmN0aW9uXHJcbkBwYXJhbSBwYXJlbnRzIE9iamVjdEFycmF5IC0gQW4gYXJyYXkgb2YgdGhlIHBhcmVudHMgb2JqZWN0c1xyXG5AcGFyYW0gY3Jvc3NvdmVyVHB5ZSBpbnQgLSBTcGVjaWZpZWQgd2hpY2ggY3Jvc3NvdmVyIHNob3VsZCBiZSB1c2VkXHJcbkBwYXJhbSBzY2hlbWEgLSBDYXIgb2JqZWN0IGRhdGEgdGVtcGxhdGUgdXNlZCBmb3IgY2FyIGNyZWF0aW9uXHJcbkBwYXJhbSBwYXJlbnRTY29yZSBpbnQgLSBBdmVyYWdlIG51bWJlciBvZiB0aGUgcGFyZW50cyBzY29yZVxyXG5AcGFyYW0gbm9DYXJzQ3JlYXRlZCBpbnQgLSBudW1iZXIgb2YgY2FycyBjcmVhdGVkIGZvciB0aGUgc2ltdWxhdGlvblxyXG5AcGFyYW0gbm9DYXJzVG9DcmVhdGUgaW50IC0gdGhlIG51bWJlciBvZiBuZXcgY2FycyB0aGF0IHNob3VsZCBiZSBjcmVhdGVkIHZpYSBjcm9zc292ZXJcclxuQHJldHVybiBjYXIgT2JqZWN0QXJyYXkgLSBBbiBhcnJheSBvZiBuZXdseSBjcmVhdGVkIGNhcnMgZnJvbSB0aGUgY3Jvc3NvdmVyIGFyZSByZXR1cm5lZCovXHJcbmZ1bmN0aW9uIHJ1bkNyb3Nzb3ZlcihwYXJlbnRzLGNyb3Nzb3ZlclR5cGUsc2NoZW1hLCBwYXJlbnRzU2NvcmUsbm9DYXJzQ3JlYXRlZCwgbm9DYXJzVG9DcmVhdGUpe1xyXG5cdHZhciBuZXdDYXJzID0gbmV3IEFycmF5KCk7XHJcblx0dmFyIGNyb3Nzb3ZlclBvaW50T25lPWdldFJhbmRvbUludCgwLDQsIG5ldyBBcnJheSgpKTtcclxuXHR2YXIgY3Jvc3NvdmVyUG9pbnRUd289Z2V0UmFuZG9tSW50KDAsNCwgW2Nyb3Nzb3ZlclBvaW50T25lXSk7XHJcblx0Zm9yKHZhciBpPTA7aTxub0NhcnNUb0NyZWF0ZTtpKyspe1xyXG5cdFx0bmV3Q2Fycy5wdXNoKGNvbWJpbmVEYXRhKHBhcmVudHMsc2NoZW1hLCBjcm9zc292ZXJQb2ludE9uZSwgY3Jvc3NvdmVyUG9pbnRUd28sIGksIHBhcmVudHNTY29yZSxub0NhcnNDcmVhdGVkLGNyb3Nzb3ZlclR5cGUpKTtcclxuXHR9XHJcblx0cmV0dXJuIG5ld0NhcnM7XHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiByZXR1cm5zIHdob2xlIGludHMgYmV0d2VlbiBhIG1pbmltdW0gYW5kIG1heGltdW1cclxuQHBhcmFtIG1pbiBpbnQgLSBUaGUgbWluaW11bSBpbnQgdGhhdCBjYW4gYmUgcmV0dXJuZWRcclxuQHBhcmFtIG1heCBpbnQgLSBUaGUgbWF4aW11bSBpbnQgdGhhdCBjYW4gYmUgcmV0dXJuZWRcclxuQHBhcmFtIG5vdEVxdWFsc0FyciBpbnRBcnJheSAtIEFuIGFycmF5IG9mIHRoZSBpbnRzIHRoYXQgdGhlIGZ1bmN0aW9uIHNob3VsZCBub3QgcmV0dXJuXHJcbkByZXR1cm4gaW50IC0gVGhlIGludCB3aXRoaW4gdGhlIHNwZWNpZmllZCBwYXJhbWV0ZXIgYm91bmRzIGlzIHJldHVybmVkLiovXHJcbmZ1bmN0aW9uIGdldFJhbmRvbUludChtaW4sIG1heCwgbm90RXF1YWxzQXJyKSB7XHJcblx0dmFyIHRvUmV0dXJuO1xyXG5cdHZhciBydW5Mb29wID0gdHJ1ZTtcclxuXHR3aGlsZShydW5Mb29wPT09dHJ1ZSl7XHJcblx0XHRtaW4gPSBNYXRoLmNlaWwobWluKTtcclxuXHRcdG1heCA9IE1hdGguZmxvb3IobWF4KTtcclxuXHRcdHRvUmV0dXJuID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcclxuXHRcdGlmKHR5cGVvZiBmaW5kSWZFeGlzdHMgPT09IFwidW5kZWZpbmVkXCIpe1xyXG5cdFx0XHRydW5Mb29wPWZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZihub3RFcXVhbHNBcnIuZmluZChmdW5jdGlvbih2YWx1ZSl7cmV0dXJuIHZhbHVlPT09dG9SZXR1cm47fSk9PT1mYWxzZSl7XHJcblx0XHRcdHJ1bkxvb3A9ZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG4gICAgcmV0dXJuIHRvUmV0dXJuOy8vKHR5cGVvZiBmaW5kSWZFeGlzdHMgPT09IFwidW5kZWZpbmVkXCIpP3RvUmV0dXJuOmdldFJhbmRvbUludChtaW4sIG1heCwgbm90RXF1YWxzQXJyKTtcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cz17XCJuYW1lXCI6XCJvYmplY3RzXCIsXCJhcnJheVwiOlt7XCJpZFwiOlwiMC5oZGY1cW43dnJtXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC41NzY3NjkwODI0NzIxMjQ4LDAuNDE3NzI4NjE1NDQ3NjgzNl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMDU4MDU4Mjg0OTkzMjI3NjMsMC41NTU4NDg1MDI5MjE4MjE2XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjAxNzQ2OTIyNDgyODMwNjE1XSxcInZlcnRleF9saXN0XCI6WzAuNzk0MTU0NjAyNzUzMTc5NCwwLjMzODYxMDU4MzEzNDE4MzQ2LDAuOTgxNzk2NjcyNzM1MDg4NiwwLjA0MDU4MzkxODk5MDM5NDcxLDAuNjc5Mjc2NDg0MDA4NDU3NywwLjcwOTU1MTY4MzM0Mjk4NjksMC40NDQyOTI5Njg5Nzg2MDM3LDAuMzcxNTk3MDk2MzM5NzgxNDQsMC40ODY1NTQ5MTM4OTgwNzMxNSwwLjgxOTQ4OTc0MzQ2Nzk5NDksMC4wNjc5MTI5Mjc2MjkyMjI1MiwwLjg1MDA2MTcxODc5ODEyMDFdLFwid2hlZWxfdmVydGV4XCI6WzAuMzE5NzQ1NDgzMzgwNDgwNSwwLjA3MzA2ODMyNTUzNDQzNTMyLDAuOTY5NjY4MDIyMTMyMTkxOCwwLjI4MjQyOTE0NDYyODg2ODUsMC4yMzgwMTA4NDM1MzU2MjYzLDAuMDM0MjAxNjM2NTI4NTAwMDYsMC4zOTMwMjA0NDc4NDk0MDE1LDAuOTI5MjU4OTAyNjE2ODYwNV0sXCJpbmRleFwiOjB9LHtcImlkXCI6XCIwLmRkdnFvOWM0dTVcIixcIndoZWVsX3JhZGl1c1wiOlswLjA3NjI3MzExNjUzNjkwMzA1LDAuMzgwNzc1NjU4MjQ3MDYzODNdLFwid2hlZWxfZGVuc2l0eVwiOlswLjAxODYzNjk3ODgxMDg2NDY4LDAuMDI2ODY0MzYxNzg5MzEwMjg3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjcwNDU1Njg1OTY5Njk4MThdLFwidmVydGV4X2xpc3RcIjpbMC44ODI3ODM2NzM4NDUxNDEzLDAuNDE5MDYxNzQ5MzQ5OTk4NCwwLjAxNzE0NzYyNjg0NDQxNzA2MywwLjIyNzc1NTM1MzQ1MjUyMDMsMC45MzkxODUyMzAwNTYyMzkxLDAuNDE2MjM1MzUwNDc0Nzk5NzYsMC42Njc4NzQyOTY2NTU0MjMsMC4zMTg0OTM2MDkyOTg0MjIzLDAuODg1NjAxNzkyMjYzMjE0LDAuMTM0NjUzOTgxMTYyMzk2OCwwLjMyMjM4NTMwMzg3MjQ4OCwwLjE2MTQwNzQ3MjM5NjkwMV0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4xNzIwNjYyNTE2NzE4MjU0MywwLjI4NjQzMDYyNzc1MDIwNjIsMC45Mzg1MTM4ODU5Mzg5NjE3LDAuNzEyMDUxNjM0Njc4OTcwMywwLjQ3NjgxODQxNzc2MzAxMjE1LDAuOTU3MzQyMDA1NzM3MTYxNSwwLjM0Nzc5NjU3NjAzNDE5MDU2LDAuNDk0MjQyODAwMTM2OTUwMV0sXCJpbmRleFwiOjF9LHtcImlkXCI6XCIwLmk1OGVpY3VvZ3BcIixcIndoZWVsX3JhZGl1c1wiOlswLjg3OTc3NDIyMDI3OTM2OTIsMC40OTQ2MDkwMDQxNzAxNjYzXSxcIndoZWVsX2RlbnNpdHlcIjpbMC42OTA3NzE1NzAwMjM5NTYzLDAuMzU0MzI5ODQ5OTM1NjE1NTZdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuOTk3MTA5NzYzOTM1ODU5N10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjMzNTU5Mzk3NjY3OTU2ODYsMC4zNjc3MDM1NjE2MTIwOTk2LDAuMjUyMjEwMTc0MDgxMzE0NzQsMC42MDQyMTM1NzE4MTY0MzUsMC4xNDMwMzAzNjk3NjUxNzQ3LDAuNjcwNzQxNDUzODUwMTM0NCwwLjc5NzY0MTA3OTA1ODU3OTcsMC4wMDMzMDQwMTkzMTU3NTgyOTk4LDAuNDgyMjU4NjQ1MDA1MzAwMzYsMC45NzIyNDYzNDkwNzM5ODYzLDAuMTMzMjY2ODUxOTA2MTg4MTQsMC4yNDUxMTg2MzY4MTg2MzI2Nl0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC45MTM0NjMyNTc2NzYzMzU1LDAuODAyODU1NzE3OTIzMTM1MywwLjA2NTIwODg3NjAyMDAyNjQ1LDAuNTAwODc4NDg0MTc1MzQxOCwwLjI5NjYwODIyOTY0OTI5NzM0LDAuODI2ODg0Nzk3MDQ5OTMzMywwLjcwMzUxMDc3MjY3Njg3NzksMC4wMjAxNDkxNTY3MjAzMTExNDVdLFwiaW5kZXhcIjoyfSx7XCJpZFwiOlwiMC5ndXRqNzZhODhmXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC45MjkzMjI5MTc5ODIxOTg1LDAuMTQwOTYwMTg4MDY0Mjk3MjJdLFwid2hlZWxfZGVuc2l0eVwiOlswLjk2MTA2Njg3NDE3ODQ0NTIsMC4xMjkxODkzNTA0NTU0NDYyMl0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC40NDEyOTM4NjEyNzc0NzczXSxcInZlcnRleF9saXN0XCI6WzAuNTA5NjY2Mjg1MzkwMTI3LDAuMDQ0MDQyNDcwMzcxODgzOCwwLjMyMzU1NTE0NjE1NDgxMDk2LDAuNTAyODU2MDQ5MTQ2NzgzNywwLjg4NTU1MjU2MTE4NDY4ODYsMC42NjM0NzQ3NjMzOTA4ODE3LDAuMDUzNzIwMTM1NDc5NzI1MjA2LDAuMDM5Mzk5MTkxMTM0NzM1NzgsMC44NjU5MTMwNDc5OTg4MDMzLDAuNTI5MjYxMDE5MTE1NTc5MywwLjI1ODQ0OTc0NDExNzMzOTQ1LDAuMTU2NzQ5NTM1OTMzMDU4NjNdLFwid2hlZWxfdmVydGV4XCI6WzAuMTA5MjI1Mjk3OTg1NDY3NTQsMC44Njk3NjcwNzUwNDYxMjY4LDAuODMwODA3OTQ1OTg3NzMxMywwLjYzODMxMDI3NjYxOTc1MjgsMC43MDk5OTY5ODU4MDk2Mjk2LDAuNTM4OTUwOTc0NTExMTQyMywwLjg5NzgzNzYzMzE5NjExMjksMC42NDIwNjY0NTAxMDg1ODg0XSxcImluZGV4XCI6M30se1wiaWRcIjpcIjAuczBxYjhnZDF1azhcIixcIndoZWVsX3JhZGl1c1wiOlswLjcyMTk4NjU5NDEwNTAwMDMsMC44NzQ5MjI4NzY0ODk4NjI3XSxcIndoZWVsX2RlbnNpdHlcIjpbMC44ODg4ODI3MzE5NzM0NDY3LDAuMzYzMzc4MDk3MjI4NDgxN10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC43ODExNTE0MzQxNzg4OTcyXSxcInZlcnRleF9saXN0XCI6WzAuMDcxMDI5ODI1MTkwMjIyNiwwLjA0Nzc3ODM5OTIxNzYwNzk2LDAuMTMyNTg4ODM4ODk5MzgwNTYsMC45NzY2NjQ3NjczMzA2ODU2LDAuNTQwMDM5OTMzNjcyNTcwNywwLjAwOTQ5MDMwMzI3MTU4MTg0NiwwLjYxMDU2MTgzNDUyOTM2MDIsMC4zMDc2OTY4NDA2NDYyODk0NCwwLjk1MzY4MjIxMzAzNjEzNzUsMC42NjA4OTYwOTgxNTczODczLDAuMzg3ODg3NjY4NDEyMzUzNTYsMC4xNDY5ODIxMTI3MzUxNTExNl0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC40NTc5NjA1NTM5ODExOTcwNiwwLjUwODIzODQwMDUzODc5MTQsMC42OTEwMDcwNjM3MzM5NTI3LDAuNDk0OTE0ODA1NzYxOTUwNTcsMC4wMTc1NjQ5ODMwNTY2Njk1MzYsMC45MDA0MTg3MTIxOTM5MjM2LDAuOTUwODg4MTQ5NDQzNzc4LDAuMzE0NTc3MTg3OTk4MzEzOV0sXCJpbmRleFwiOjR9LHtcImlkXCI6XCIwLmFtNTBza2ZpZnY4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC40MzcxNzgyMTUxNzA1MDE3LDAuMTY5MzQ0MDc1Mjg2Njk1OTNdLFwid2hlZWxfZGVuc2l0eVwiOlswLjUxNTU2MTU1MzAzODI0NDUsMC4zNzQ2Mzk4NjI2NTU4NDg3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjk3Nzc4MzEwMTAzOTg1NzldLFwidmVydGV4X2xpc3RcIjpbMC40MjE4MjU0MzMyOTE4NDAzLDAuMTM0MDI5OTE5Nzk3OTg1OTUsMC41Njc5NTIzODMzODA0MjYxLDAuOTk4NjM2MDQ1NDcxMjEzMSwwLjEzNzAyMjY1MjkwNDk3MTQsMC42ODY2MjI2NzIzOTk0MzA5LDAuMjEwODUwNjY3MjI4NTgxNDgsMC4xMTIwMTI4MTAzNjM0Nzg1NCwwLjY0NTg4NjgwODM4OTYyNDMsMC43Njg2MzQ5MTc5MTkyNTk1LDAuNTYzMTI3OTQxMDgzMzA3NywwLjg5Mjk1Mjc4NzAyNzczOTRdLFwid2hlZWxfdmVydGV4XCI6WzAuMzIwMTMwMDQ2MzM5MzEwMiwwLjc4ODEzMDQ3ODUyOTc2NjksMC4xOTk0NjIyNjYzODcwOTUzLDAuNTM2MTMxMjQ3MDc5MDUyMiwwLjkzNzI4NDQ3MDQzMjcwNzcsMC42MDI5NTY2MTA5MjA3OTMxLDAuNjY1NDk1OTkyMDM5MTgyMSwwLjI1NDQwNzU2MDc5MjA5MTddLFwiaW5kZXhcIjo1fSx7XCJpZFwiOlwiMC5tamNnOWZlbWFuZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuNjA3NTI4NjE3ODk5NjMzNSwwLjAyODkzMjM1MDg3ODI5OTkzXSxcIndoZWVsX2RlbnNpdHlcIjpbMC42ODgxMTcxMDg5MjA1NTQ5LDAuMzY4MTM2OTAzMDUxNzc2MjddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuOTE5NDc0MzY2Nzk0NzkzMV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjkwNDU2NjY5MDgxMzI4ODEsMC4wMzE3MDE0NDkzMDQ3ODAyNSwwLjMzMzg0MTMwMDIxMzc0MDYsMC43ODQ4MTcwMzg1NDA4MjY2LDAuODgzMjQwNzc3MjI0MjgxNiwwLjgyNjUzMzQ3MTg3NjkxNDQsMC45NjI5Njk1NTMxMjQ0MjI5LDAuMjczNjA0MTQwMjA5MjE5MSwwLjgwODgwODc0NDk3NjM4MDEsMC40MTA3NjEwNzMxMjc5NDU2MywwLjgyMTc5OTY2MzM2Nzk3MDUsMC4xNDgzNzAyMzY1MjMxNzM2XSxcIndoZWVsX3ZlcnRleFwiOlswLjExNDgwNzgxNzQzNTEzMTAyLDAuMTY5NzM2ODk5NDk3NzE3MywwLjIyOTg2NDE1OTIyMDU0NTI2LDAuOTUxMTUzNjU0NjM3NTM1NywwLjc4MDkyMzEyOTIzOTE0NSwwLjc5MTAyNjgzODk2NjM4MjgsMC4zNDU2MTAzNDY0Nzc2Mjc3LDAuOTYxMzg1OTc3NjUyNzkwN10sXCJpbmRleFwiOjZ9LHtcImlkXCI6XCIwLmlkZmp2ZTZmOHQ4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC41NDExNTU5NTgxNDk1MTczLDAuNDQxMjUwNTMwNDgwODkwNDddLFwid2hlZWxfZGVuc2l0eVwiOlswLjI1OTA5ODc1NDkyODI2Mjg0LDAuNDcwMjEzOTkwNjk0NTYzMjddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMzYxMzcyODIwMjI4NTAxNl0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjQxMDIxMzkxNTQ0MjY5MzE0LDAuOTg4MTkzMjk2OTc2OTU4OSwwLjQ5ODQ3MTE0ODU5NTU0ODg2LDAuMzczMTk3Njg3Njg4MDU5ODMsMC4wMDUwMDI1MTM0Nzc5Mjk5MDQsMC40ODk5Mzk5NDU1MDczNzY3NCwwLjk2NzI3NTY4MjQwMTE2ODEsMC42MTA5MjcxMTczOTI3LDAuNjY5ODAxNDc1MTIzODg3MiwwLjk5NzM2OTAyODA5NTAwNjcsMC4xOTQ0MzYzMjg2OTQ0NjIxNSwwLjA0NzY1ODQ3MDU1MDQ1NDEzNV0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4yODY0MjcwNzQ0ODA1NDg2LDAuMTkwNDAwODM4MDYxMTI4NjIsMC43NzE5NTQ3NjE4MjA3Njc2LDAuMzEzMDY4ODAyMzk5MjQyMywwLjU1Mjk5MTYzNjQyNTkyMDIsMC45MTMzNDM0ODA4Mzc2NjE5LDAuNDcxMTUyOTA2MjI2Njg4NiwwLjg4NzEzNjAyNDgyMTAzOThdLFwiaW5kZXhcIjo3fSx7XCJpZFwiOlwiMC45a2V2N2VlZnAzXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4yOTgzMTUyNzMwNDg1ODE2MywwLjc1NDQ4OTU3MTYwODc2MDVdLFwid2hlZWxfZGVuc2l0eVwiOlswLjE5ODE4Nzc5ODgzNTY2ODQsMC43MDE3NDA3MTIzMjI3MzU1XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjEyNjk4MDAyMTE5NzIzNjA2XSxcInZlcnRleF9saXN0XCI6WzAuOTE4OTI4MzI0MzY0NDIyOCwwLjY3MTE0MTYzNzg2NzMwMjUsMC41MDc5NDE5Mjg5Nzk5MzU0LDAuNjE4MTAzNjQ4NDI0NDI0NCwwLjk0Nzk2OTU2NjIyMzk0MTEsMC4yNjk3MzM1MzkzODk1NjM0NiwwLjc3NTY1MTM1ODg5MjI5OCwwLjg3NTYxNjkyMzMyOTM5MDcsMC4wNTc3MjYwMjY3ODgxMTU2NywwLjI1NTQ5NTA3NzM2OTI4NjgsMC43Mzk4NjQxNjM4MTA2MjAzLDAuNzExNjg2NzY0MDAzNzQ3NF0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4xMzIxMTA4ODIzOTIxMzE1MywwLjAyNzA0MjQ2NDYwMzM3NjAwNCwwLjAwMjcwNDYwMjI0ODQ4MjY3OTMsMC45MTg4OTA4NDEyMDQ3MTI4LDAuMTI3MzQ5MzczMzAzNDY2OTYsMC42MzEyNDA5MTM5Nzg1Nzg2LDAuNTQ1ODM2MTE0MzQ4Mzc3MiwwLjQyMDI3ODAxMjMwMzc3MDhdLFwiaW5kZXhcIjo4fSx7XCJpZFwiOlwiMC45NG92MWl2dmQxZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuNDIxNzQ1NDg2NTU2ODU0NiwwLjE0OTMwNDYyODY3NzM3NzZdLFwid2hlZWxfZGVuc2l0eVwiOlswLjE1NzgwMDE0NTM5Nzg1NzQ3LDAuNjM0OTM4NzkwOTEwMzkwN10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4yNjExMDE1MDgyMDIyMDgxXSxcInZlcnRleF9saXN0XCI6WzAuMTYxNDA1NjE5ODExNTA2OCwwLjcwNzMzODUzMDg4MzE0ODEsMC44ODY1Nzc1MjA0MDU5OTI1LDAuMzg1OTI5NTk1NzIyNjgxOCwwLjAwNjMyMzc0MTQ5MDcyMjkwMSwwLjU2MDA3MTcxNjAzMzgyMjIsMC43MTUwODI4NTg0MzQ0NDA0LDAuNDY0NTQ1MTU1MzQ4Mzc1MjYsMC4wODc4NzExNjkwNzE1NjcyMiwwLjc0ODI3MjY0MjQzODEzODMsMC42MDA3MzM0MDc5MTkxODY4LDAuMzEyNzExODcxMDMyMjg4N10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4yNDM2MjI4MzU3ODExMTMyLDAuODc3MDk5MDM2NzM4ODQ4MywwLjU1NjMzMjQ1MTg1MzgzOTUsMC4yMTU4MDA1Nzg1NjkxODcsMC43OTQ3NzQxOTM2Njc5NTMxLDAuNzQ1MzE0NzI5NDc0MjYwNCwwLjczMjY2NTUwNTAxMDQ5NTEsMC44MTI1NDMzNzQ3MDczNzA5XSxcImluZGV4XCI6OX0se1wiaWRcIjpcIjAuZXV2M2NoZmNvZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuNTA2MTgwMTkyNTkwOTA4LDAuNDA3NDMwMTI0ODAyMzI3MV0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMjI4MTkzODcwODg1MjY3NTUsMC4yMDM4ODQwNzk5Nzk3MDA4Ml0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC45ODY4MDk4NDk5ODI5NzM4XSxcInZlcnRleF9saXN0XCI6WzAuODkwMTEwNDkxNjIyMTc5NCwwLjAzODI0NjA1MzYyMzg0MjcsMC4wMTI0NzYyMTc3NTE4OTA0NSwwLjMxOTgyMzkzNzUzOTAwMDQsMC4yNDYxNDI2MTcwMjU4NDExNywwLjY2MTIxNDIwNTYxMDg5NSwwLjIwODg3ODYxNDA3MTc5Mzc2LDAuMzA3MjQ0MjcyMzUyMzQ4NzUsMC42OTA2NDc3OTkzMjE5NDcxLDAuMTM0MjAzMjgyNjEwNDUyNDUsMC41NTYyMDU3NjYzOTI1MDY0LDAuNTYzNjkxMjMzNjA2MDcxM10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4yNzI5Mjk0MDMxNTgyNzk4NSwwLjgxMTY2OTQ4MTEwNDk5OTQsMC4zNDMwNTQyNzA4MTI2NzYyNSwwLjczNzc5MDM3MDkyNjM5OCwwLjcxNDQwNDk2MzIwNTE5NzYsMC40MTM2NTUzNDkyODIyOTU0LDAuOTA2NTc4ODY1MDY2OTQ4NiwwLjI2NzM0MzY2ODQyMjA0NjddLFwiaW5kZXhcIjoxMH0se1wiaWRcIjpcIjAuM3Q3M3IwODk4NzhcIixcIndoZWVsX3JhZGl1c1wiOlswLjMzNDM0Nzc4MjM2MDgxODk3LDAuMzMxMTA3NTAwNDQ3Mjg5Ml0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMTQ4MjY1MTA4ODc3NTIwNjUsMC43NDg3NDAwNTc3MDE4NjldLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMDk2ODY5NjQ3NzgwNTk1NDhdLFwidmVydGV4X2xpc3RcIjpbMC4xNzM0NTE4OTA5NzMzNTgsMC45NTQ5NTc4NTM1MDQ0ODYsMC4xMjk2OTAxMjM4ODYzOTM2NywwLjgwOTM0NDAwNDk1Nzk3NTksMC4yMDY2MjE3MDIyMzYzMzIzNiwwLjU5NTc0NzU0OTQzMDgzNjksMC4xMjA5MzA5MzY0NDYyNzY3MywwLjIzODI3Njc4NTE1NDA2NDE0LDAuODc4MjM2OTc3MTU1MDU5MSwwLjE4NzkzOTcyNDQwOTAyMTc0LDAuNTM0MDI0OTg0NDYxMjc3NCwwLjY3NDY5MzYyNTU4OTY0MjNdLFwid2hlZWxfdmVydGV4XCI6WzAuNzczNzQ1MjgyODU2NTUyOCwwLjIxNzk3MzI3MDQyMjMxMjMsMC42NDMzOTI2MTI2OTMzMjI3LDAuMDU1OTczOTkxMjg4NjMyMTIsMC44MzY0OTA5MjAxMDI4MDgxLDAuNTU5NDI2NjM2ODU0MDg4OCwwLjQ4MDI2ODkyNjcxNzM2MzY1LDAuMTMyODYzMzg1NDQ3NDU5MDFdLFwiaW5kZXhcIjoxMX0se1wiaWRcIjpcIjAub3RwNG1oZ2ZmbGdcIixcIndoZWVsX3JhZGl1c1wiOlswLjMwOTY3MjM4OTA4OTkwNzYsMC4zMjcwOTA1ODQ1ODYyNTM1XSxcIndoZWVsX2RlbnNpdHlcIjpbMC45NTE5Nzk3Nzc5NDcwNjU4LDAuNDgyNDY1OTEyNzk0ODY5NF0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC41MDg4NDk1MTM5NzE2MzRdLFwidmVydGV4X2xpc3RcIjpbMC4wNTM4NTA3NjgwNDgyMTAzMiwwLjQ3MjQ2MTU3Njk3NTQ1NzIsMC40NzU5MTg3NjA3NTcxOTkzLDAuODQwNDM5MjEwMzkwNDY5NCwwLjYwNjgwMzkxODQwNTY5ODYsMC4yNDUwNjAzNzk1NzYyNDUxNiwwLjc4OTA1ODM1OTEwOTcyMTgsMC40MjgwNzI3MzQ4Mjg1MDE0LDAuOTE0MzA4Mzk5ODE0NzQzLDAuMDE2Njc5MjQ1Nzg2MzUwNDk0LDAuMDIzNTk3MzY1OTIyNzk0MTU2LDAuNTQ3MjE1MDQ3ODI5NjUyNV0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC45NjgxMzI1NDcxMDg2OTIzLDAuODQ0MDU5MjgwNDgzMjQzNiwwLjU2MzMwNDM4ODc1NzI5NTMsMC4zODY1OTk5NzE5MDU3MzExNCwwLjk0NTcyNTY5NzY4MDIwNzMsMC4xNTY4OTU5NTc0NjgzODQzNiwwLjU0NTk5MDMyODEwNjM0NDMsMC42ODM0NzY2NjAxNjQzMzQxXSxcImluZGV4XCI6MTJ9LHtcImlkXCI6XCIwLm03MmNtOGdsY2lcIixcIndoZWVsX3JhZGl1c1wiOlswLjQ5MjExOTAyMDU3MDI1NTcsMC45NzMwMTIzMTIyMTg3NDQ4XSxcIndoZWVsX2RlbnNpdHlcIjpbMC42MTM4NzMxMTA3NjIyMjcxLDAuODAxODg4MjYwNzQwNzddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMjczMzYzNjYyMjEyNjU0OTZdLFwidmVydGV4X2xpc3RcIjpbMC40ODY3MzM3OTM3MTM0NzcyNSwwLjU2MTY2Mzk0MjExODY4MDksMC42NjUyNjI4Njc1NDUzNzMzLDAuNTIxMTI3ODY5NDgzMDk1LDAuODgyNjIzNjY4MDI4MzcxNCwwLjc3MjQzNzAxNTk2NzE5NjMsMC41MzI4NTQzNjQzMDE0ODc0LDAuNDgyODk5NDUzOTUwMzE5NzUsMC43MDExMTI4OTM5OTg1ODQ1LDAuOTQwNzkxOTM3NDk1OTEzMywwLjUxOTY3NTgwMTYyNjgxNDQsMC4yNjIxNDYwNzczMjYyMjU2M10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4wMjY5NjgwMzcxMzUyMjg3NzMsMC44MDc4MTE1MDkwNDY4Nzc4LDAuMTE1Njc4NzE2OTQ5OTgwNDQsMC4yODg3NjUzMTUyMjEwNDgxLDAuMTA4NzE2MzYxNjk3MzU2NTQsMC4yOTAwNTgzMTAzODQxNTY5NywwLjk3MDUyMDgyODU4NTYzOTUsMC44NTIxNjk5NjMyNzYyMzA1XSxcImluZGV4XCI6MTN9LHtcImlkXCI6XCIwLjloanVxMHZhcms4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC43Mzc3NzQyMjcyNDI0NjA2LDAuMjc3NjY0MTk3MTE1MzkwMTRdLFwid2hlZWxfZGVuc2l0eVwiOlswLjEyMDY3OTgyMjg4MzgwOTc0LDAuNTUwODQyOTQ3NzQ5NzgwM10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC40NzQyNzc3MzA3MTkxMjc3XSxcInZlcnRleF9saXN0XCI6WzAuNDc1MzI1NzM4NTA5NjE1LDAuNjUzNDYyNjk2MjY4MTg2LDAuMjM2MjQ0NTIxODUwNTk5NTIsMC44NjI0NzczMjk1MzM2Mjc5LDAuMzg0MzY2MzA1MzU2NzcyNSwwLjI5NjI0MTYzODc2MzYxNjY0LDAuODU1NTg2NDAyODA2MDM2MywwLjYxNTM3OTc3MTI2MjE0MDUsMC4wMjI5MDkzMTMzMDg3Nzc2NTcsMC43MDc4MDczODE5NDA1MzczLDAuMjk5NTYwMzIzMzAyMzg0NywwLjk1OTE1OTk4NTUzOTkxOTFdLFwid2hlZWxfdmVydGV4XCI6WzAuOTE1OTE0NjI2OTEzMjU5LDAuNjk1Njg0NDY5MjA3OTg3OCwwLjMzMjg0NjkxOTYzMTc2NDA1LDAuNzkxOTk4NTE5MzYzMDg5MiwwLjg4NDY5OTY0ODM4MjYwNzcsMC43ODYyNjA2NDMzNTE1NTY3LDAuNjUyMzMyNTc2Mzg5NTA5OCwwLjgwMTYxMDk0MjA3Njg0MDddLFwiaW5kZXhcIjoxNH0se1wiaWRcIjpcIjAucGs0dXFybzQxdVwiLFwid2hlZWxfcmFkaXVzXCI6WzAuODY1ODg4MTAwNzgwMzE2NSwwLjMzNTczMzE5ODYzOTg0NzNdLFwid2hlZWxfZGVuc2l0eVwiOlswLjU2OTIwNjQ1NTczMDczMjQsMC4yNzkxNDU0ODcxMDExNTYzXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjMxMjAzNzU0MDAzNjcwODZdLFwidmVydGV4X2xpc3RcIjpbMC45MTg5NTU0MDA5OTkyNTI0LDAuMzU0MjU3OTEwMDQ3ODQ2OSwwLjE0OTY0ODI2OTYzNDQ3MTY0LDAuOTU0ODk5MjAzODEwOTQ0NywwLjUxMzY5ODE4NDc5NTgwMzEsMC41NDI1NDIyMjMzMzI0MDc4LDAuNTM4MjMyMjY2NzMzOTQ0OCwwLjY4Njc0MDQ4MTkwNjE5NzEsMC4yNDAzMDcxNDA5NzA0MTc2LDAuNTk2MDE5MjAyNjE1MTcyOSwwLjE5ODEzOTE4NTQ2NjA3MjgsMC4wNjUyMTE5NTU1MjE1OTgyXSxcIndoZWVsX3ZlcnRleFwiOlswLjkzODIxNDcyODcyODQyMDYsMC42Mzg5MDMyODk3NjM5MzQ2LDAuNTc0NTA2ODYwNjg5Njg1OSwwLjMyOTgwMDc5NTYyMDM3MzksMC4zNzQ4MDEwMjI1MjQzNjU0LDAuMTU1NTMxMjc0NTc1OTQzNCwwLjM0ODg4NjUzNjg4MDk4MTUsMC4yMjg4NjA4OTAxNTgwMDQ3XSxcImluZGV4XCI6MTV9LHtcImlkXCI6XCIwLjkycG1xZnRtMDc4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4yMDk0MDE4NjM1NzgwNDMwMiwwLjk2MDE4MzE4NTU2ODQ1MDJdLFwid2hlZWxfZGVuc2l0eVwiOlswLjYwNzQ4NjUwNjI1NTI1MzUsMC40ODcyMTQwODQ4NTc3NDRdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuODg3OTc3OTU4MTQxNzM3M10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjM3MjI5MzU4OTExNzA5NTc2LDAuMzI1MDYzODE0OTMwMjQ2MywwLjAyMzk5NjI0MzM0MTY3Mjk0LDAuNTA3Njg0NDkyNTkyOTM2OSwwLjkzNjE3ODg3MDYzNjAwNzcsMC41NTk5ODc3Njc1MTk4MDEzLDAuNjE3ODc2MTcwMTk0NTE5NywwLjE5MTk5NTE1NDEyNDU5MzIzLDAuNDM2ODkzOTk0NDkwOTYyLDAuMzQwOTczMTQyMzM3NzQ5OCwwLjQ5ODI1NTk1MDA1NjAyNzUsMC4zMDE4MDU0Nzc5ODYzMzQ0XSxcIndoZWVsX3ZlcnRleFwiOlswLjQ4MDU1Njc5OTI0MTY5MjgsMC41MjkxNzI5NzE1MDg0MjUsMC40NTc2ODI0NDkwMTg1ODY3LDAuMjg4MTU4MTYyNTk5NjY4NTMsMC40MTMwNzAzODAyMTI3NzU3NiwwLjg0OTYzMDMxMDIxNTAzMTUsMC40NDI2MjQwOTQxMDI4MDkyMywwLjExODk5MDgzNTM5NzM2MV0sXCJpbmRleFwiOjE2fSx7XCJpZFwiOlwiMC5wMGJiM2pjc2E2b1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuODA1Mzc3MDQwOTM2Mzg3NiwwLjAwNDYwODUxMTUwNTg3NjQ4OV0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMzcwMzI5MzY1ODUzMTk4NTMsMC45MTEwNzE4MjkwNzM5OTAzXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjQxMjY4OTMxMzY2NTU1NTE3XSxcInZlcnRleF9saXN0XCI6WzAuMzc1MDU1Mjk2MTY4ODc0NDUsMC4zMjY5ODk0NTU1Nzg4NDczLDAuNzgyNDI4NzMzOTYxNzg5NywwLjA4OTE2NzU1MjYwMjcyNjAyLDAuMTE4NDYzNjg3ODk5NTg3NzIsMC42MTgyMzA1NDAyMDY5ODQ4LDAuNjg4MzQ2NzQ4MDE1ODkyOSwwLjM4MTc3OTA1MjE0OTk1NjY3LDAuNzIwODE4MTYwOTU5MTQzMywwLjcxODI4MTE2NzI5ODA3MzEsMC41MDUzNDAzOTgyNDMzOTY2LDAuNjc4NTQ4NTkwMzg4OTM5Ml0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC44NjAyNTE2NDM0NjY3MTI3LDAuOTE4MjQxMjg5NTY0ODcxMywwLjQ5NDMzMjE0NDY0OTQwNTgsMC40MDY2ODE0NDI0MDUzNjMzLDAuOTQ1MDAzMzkzNDQzNjk2NSwwLjA0MTQ3Njc4NDE2OTAzLDAuOTA3NDMwMzE0MTAyNTI4MiwwLjc5MjA4MDUzMTgxMzkyOTVdLFwiaW5kZXhcIjoxN30se1wiaWRcIjpcIjAuZzZudWU0MG82dVwiLFwid2hlZWxfcmFkaXVzXCI6WzAuMjU5NTAzNjUxNzkwODkyODUsMC40NTExNzE5NjY5NjM2MTUxN10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuODczNzc3MzIwNzQ5MTY0NiwwLjM4MjUwNDk0NTkxNzU5ODRdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNTc1MDYzNjA1NjQzMjY0M10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjE2MTU1MDc3MjcyMjc0MzY1LDAuMTc0MDE5MTQ3NzMxNzAyMzUsMC40Mjg3NTgwNzgxMDc2NDgxLDAuNDI5MzI5MjM4NjAzMDU4MjcsMC40NzYwODE0MzUwNjczMTMyNiwwLjAxNjE0MTY2NjE4MjE5ODAzMywwLjc0OTAwNjk1OTkyODM2OTcsMC44Nzc5MTU2NjMzNzU0OTc2LDAuNjA4MDkyODQ3MDE4NTU3OCwwLjQ4NDU3NjMxNTQ5NjA2MDUsMC4xNTk4OTY5NDUyNTg3NjA0MSwwLjU0OTIzMzA2MzI5NzE3MzRdLFwid2hlZWxfdmVydGV4XCI6WzAuNDg4NjYwNDI2Nzg1OTk2MiwwLjk1MDcxMDA1NTMzNjAyOTksMC44OTYzNzg2MDA0MTA2OTA2LDAuMTM5NjIwMDQyNjg4OTAzODIsMC4wMTcxMDUzMDU3NjEzMzkyODQsMC4xMjAzMjA4MTMwMzI4NTY4LDAuOTAxNjg1OTY0NTQ0MDI1NCwwLjMxMjgyNzk2NTk1NjI2MjA2XSxcImluZGV4XCI6MTh9LHtcImlkXCI6XCIwLnVpa3BtOXJtYmJcIixcIndoZWVsX3JhZGl1c1wiOlswLjA4MDY0NTE1MDQ3NjIwNzgsMC4wODQyMzEwMTQ2OTg0MTUzMl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMzQ0NjM5MjgzNTA0MDYxMjYsMC44Njk0ODk1MDMxNDc4NjcxXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjE0MDA4NDgxNzk2NDYxNTI1XSxcInZlcnRleF9saXN0XCI6WzAuNjg2MDM1NTgyNzgyMzY3MiwwLjk0NzU2Mzc4MzQxODM3NDYsMC41NDgwNDQ2NDgxODgxOTQ2LDAuMjcyOTA3MjkxMjY3ODMzNCwwLjkxNTgwNzE2MjkwMTE1ODIsMC41NDAzNjc3MzEyOTE5Mjc3LDAuNzExMDQzODM3NTg0ODAzNiwwLjM0NjY2MTM1MzUxNDEwNDU0LDAuNzgzNTg5MjY0NzYxMzE1NCwwLjI2OTE0MDMyNzE2OTk0MDQsMC4xNDQzNjA0NjQxMTYyOTAzMywwLjI3MTY4NTE2Nzk0NzA4Nzk3XSxcIndoZWVsX3ZlcnRleFwiOlswLjgxNzY1OTQ3NTU5NDYxODcsMC42NjM3MzU1MjQxNDQ5MTY4LDAuODQwMjQ3Mzk0NDk1OTM4MSwwLjY0MzU1ODIxMzEzMDE3NzgsMC45MTcwNDA4NDEwNDI2MjMsMC45ODI0Mzg3NTI1NTgzMjExLDAuNDk3OTE2Mzk0NDY2NzA2NDQsMC4wMDUzNzc4MzAxODIzNjE0ODddLFwiaW5kZXhcIjoxOX0se1wiaWRcIjpcIjAucGhrb2Q0aDY2Nm9cIixcIndoZWVsX3JhZGl1c1wiOlswLjM4ODUxMjE1NDcwNTIxMTUsMC45NDA4MTQ3Nzk2ODY3MTc1XSxcIndoZWVsX2RlbnNpdHlcIjpbMC42MDY2NzYwNDk5OTIwMzg3LDAuNzQzNzg1MzczNTE0MTQ3OF0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4wNDc2MTkzNDg0NjM3NDQ4MjZdLFwidmVydGV4X2xpc3RcIjpbMC4yODE4MDE4MTg4OTk0NjcxLDAuNTM3NjcxMTI4MzIzNTUxMSwwLjI3ODI2NTI0OTM0NzA1NywwLjM3MTgwMzgwNzQ5NDA0MDYzLDAuMDAxNjM1NDExMjQ0MDc3MDY3NCwwLjM3MzQ5MjAyOTg0MDY1MzksMC45MjU4MjQzNjQ5NDMzNTQ2LDAuOTYxMTI4MjAxMDY0ODA5OSwwLjI2MzU2Nzc3NTg0NDMzMDIsMC4yOTk1MTIyNjY5Njk4NzY5LDAuNDUwMDk1Mzc2MjE2NjMxNzYsMC4xNDEyMDQ5NTAxODk2MTk1NF0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC44MjExNTI3MDI1MzAwMjQzLDAuNjM3ODUyMDY0NjE1MDA4NSwwLjg0MzM2OTEyNDI0NTA4ODcsMC4xMDA4MDExMjUzMDUxNDkwNiwwLjc0MjA1NzE3MTg2NDMyOTQsMC4wNjI0MDY1OTQ0OTUzNzU3OCwwLjUwMTk5NjM3OTgyMjkxOTIsMC4xMzk1ODgwMzMyNzAzMzI3Nl0sXCJpbmRleFwiOjIwfSx7XCJpZFwiOlwiMC5jZHNiMnQwYTBnZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuMjQ1MDU4NDIxNzY2MDE5NjYsMC40NzkzNzU3MDY2MTU4ODAzNl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNzMxODk2MzM1OTE5ODg4MiwwLjIwNDMzNTkxOTA2NzE0MjU1XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjk0NDA4MDQwMTM4MDgwMTddLFwidmVydGV4X2xpc3RcIjpbMC4yNzY3MTc3MTg1NzM1NTcyLDAuNDAxOTEyMDY5MTk3MzkyNTMsMC42OTkyNTIwNjMxNzUzNjQ5LDAuNTgwNTM2NzA1NDc2NTY3MywwLjUzMjg3NjA2OTQ1OTU4OTMsMC42MDUxNjU1MjY2Mzk2ODU2LDAuODY1OTM3NDkyMzY5ODIzMywwLjYzODU3NDA1MTgxNjQ1OTEsMC4wOTEzNjE3NTY3MjQ5NTI5NSwwLjE5NDYyNjcxNjI2MDc5MzMsMC41ODQ4MzI0NzgzNDE5NDcyLDAuOTYxMjExNTA2OTg4OTgxN10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC45ODQwNDE5NzA4Njc0NDA0LDAuNDAwMjA3ODMyODg3NzUzNCwwLjYxMTQ2Njg0OTMwMDQ5NjksMC4wNTQ3NjYyODI2OTYzODc1LDAuNzU5MDI2MzIzNjE4Njg5NiwwLjkwOTU4MjE3MTg0NDM2NTEsMC44MjUyNzg1MDAxNDQ1MTkzLDAuOTM1NDU3MzUwMzE0NDc3OV0sXCJpbmRleFwiOjIxfSx7XCJpZFwiOlwiMC41ZWMzZjd1Yzg2Z1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuNzQyODc5NDUyNjczNzczOSwwLjE0NzI3MDc5MDU1MzUzNTU0XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4yMTcyMDEzNDMyNDY1NzU1OCwwLjU3NTQyNjg3OTQxNDY4MzddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMjI0NzY0MjE0MjQ4OTcwMDhdLFwidmVydGV4X2xpc3RcIjpbMC44MjEyOTYzNzI4MTYwMTA1LDAuMjI5NzMzMTg5MjIwNzQ4NiwwLjIxMDU4ODE3OTc3NjQ1NTI4LDAuMzAwMjg2MzM0OTE5MTQ0OSwwLjE2MDk1NDI0MTEzOTUzMDgzLDAuMjg1NzA5NzkwMzUwMDE4NzYsMC44NTA1MDUzMjI1OTU5MjA1LDAuMDEyMDk5Nzc1NTY1MjQ1NjYzLDAuNDMwNzE5MDk3MDI5NjE0NjQsMC4zNTgxODIwNjczMzkwMzM3LDAuOTk0MTM5NjY2MzM1MDk1MiwwLjE3MTE1MjA0NjYzMTY0NzYzXSxcIndoZWVsX3ZlcnRleFwiOlswLjYzNDkzNjUwNDM2NDczOTMsMC44NTY0MTY4MDU2NTU5MjI3LDAuODM0NzMxNDEwMzk4MzE5NywwLjAxMzU2MTYwMDk4OTExNTUxOSwwLjIwNDczODEzNTU1ODk5MDc5LDAuOTczNzg4OTQ5NTMxNTI4LDAuMzI5ODk1NTQ3NTcyMDE5MSwwLjcwNDA0OTg3MDI2ODI0M10sXCJpbmRleFwiOjIyfSx7XCJpZFwiOlwiMC5vMm03ZTNqbDVtXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC44NjYxMzY5NDQ3NDIzMDkxLDAuMzYyMDkxODY2MzY4NTUxNzNdLFwid2hlZWxfZGVuc2l0eVwiOlswLjI0ODg2MzY5OTQ4Mjk2MjcyLDAuOTQ4MTEzNjcwODk2MTY5N10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC40NjQ1MzQ5MDcxNDI4NTk3XSxcInZlcnRleF9saXN0XCI6WzAuMzk2MzE1ODE3MTc0MDIzMywwLjMyNTYyNzg4MjI0NTI5MTYsMC40MzU4ODY1NjIxNjkzMDgyLDAuNDE4MDA2NTc1NjcyMDEyNCwwLjAzMzUwNzU3NzkwMTI2NjEzLDAuMjY4MTA2NzQ5NTk2MjcxOSwwLjE5MTQ1Nzk5NTI2MjY3MzM3LDAuNzM3MTExMTg4NDkxMTU2NSwwLjQ1MDA0MDg5NTUxOTU4ODUsMC4xMDY4ODI2MTU2NzY3OTM0NywwLjM4MjE1NDEzMTE0NjQ5MjIsMC4wMDk0MTY3NTA1NDExNzIxOTJdLFwid2hlZWxfdmVydGV4XCI6WzAuOTU3NTQ2MjcxMjg2NzU1MSwwLjU2OTU1MDA3NjIzNTU4MDMsMC43OTgxNDQzMDAyMTU0NjA1LDAuOTQ3NDMyODQwMzc0OTgyMywwLjcwMjcwMTYwOTY0MDA3MTEsMC44Mjg2NDI0NjYzNzEzNjk2LDAuODMxMDUwMDAwOTQ2MTc3MiwwLjIwMzg5NDUxNzk4MzIzNTQzXSxcImluZGV4XCI6MjN9LHtcImlkXCI6XCIwLnZpajdoNGxsM2lnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4xODE0OTgwMDc2MTU1NDg4LDAuMjYzODk3NjIwNTA3MjI1NjVdLFwid2hlZWxfZGVuc2l0eVwiOlswLjI4MjkzNTI5NzI3MDM1MTgsMC43NDI2NDY4OTc4MTc2NTA2XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjAxNDQ4NjY2MjYxMzgyMzM2NV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjA1MzA4Njc3NzU4NjA2MjE3LDAuMzY2MDMyOTkyMDAwMDEwNSwwLjkxNTQ1ODgxMTExMDk3NTYsMC42NTk5MzY3NDAzMTQyNDcxLDAuMDA2MjM2NzAxMDAwMzcyMTAyLDAuOTQxNjc3OTc1NzczNDcxNywwLjgwODA4MDkyNzgzMzk2MTgsMC40MjQ5OTcxNTg1NzI5MTgyLDAuNDM5NDIwMjM2MjMyNzA3NzYsMC40NDYzMjE3ODIwNDQzMzQ4LDAuNzQwNzU3MDIwNjM4OTU4LDAuMDkxNTQyODYzNjI4NTQyNDddLFwid2hlZWxfdmVydGV4XCI6WzAuMTcwMTQ3ODg4NzExMzk5NCwwLjIzOTUxNTAwMDI2NjUxNjk1LDAuODQxNzE2MDc1MzA1MDA4MSwwLjQ0NjY4NjMyMTk3MzEzNzg1LDAuNzk4NDc0NjYyMDExMDkwMywwLjI0OTkzMDUwNTA5NzI5NjQyLDAuNTk4MjYxMzQxMzcxODAzNiwwLjAyNDYzNDE0MzM4MDM3NTYxN10sXCJpbmRleFwiOjI0fSx7XCJpZFwiOlwiMC52YnVkcHE3cjhqZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuMTg4MDgzMzc5MjA4NjUzOCwwLjI5MDk0MTc1NTYyNTM3MjRdLFwid2hlZWxfZGVuc2l0eVwiOlswLjM4MzUzNTM2MDc0ODc2MzcsMC4xMjU0MjQ3MTEyNzgwNjE5OF0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC45OTE0ODg3MjY2Nzg3ODM1XSxcInZlcnRleF9saXN0XCI6WzAuMTQwODIwMjMyNzk1MTk1MywwLjkwMDY1NjM3NDkxNzI0NTQsMC4yODYwMTMxODk2NTQ2NzQ3LDAuNTAzNjA1ODI2ODAxNTA5NiwwLjI4MjM3MTc1MzUxNDY0NTk0LDAuNjkyMDkzNTA5NzcxNzU0OSwwLjQwMzAwMjE0MzAyMDU4NTksMC40NTI2MzQ5NjI1MzM0OTM4LDAuMzI5NTEwNjYxMzg2NzUwNjcsMC45OTE1NjM5MzAzMjQ4OTI0LDAuMTU0MjE0OTE3ODAxODA1MDcsMC41NjU4MTIwMzc2NDQ1MDI4XSxcIndoZWVsX3ZlcnRleFwiOlswLjYyMDc3OTYwODEyNTE0OTgsMC4wODQ1NzUyOTMyMTg3OTk5NywwLjMwOTU5NjA4OTM0NTA0NTU3LDAuOTI4OTg4NzkwMTUwNjA3NSwwLjIxMTM0NDIwMDkwMDAxMDM4LDAuMjY2MTU4NDc0MDQ3ODEwNDYsMC45Njc5OTg2MzI1OTkyNTc2LDAuMDM2MzkzMjY2NjA5MDU2Mjg1XSxcImluZGV4XCI6MjV9LHtcImlkXCI6XCIwLjRpZ2tzNzdkZmxnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC42MTYyNjMwNjg4ODA1MTA5LDAuOTk2MzIyMTk1NzI0MTE2XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4wNzIxOTM4OTU1ODM5NTAyOCwwLjgxNjMwOTAwNDE1Nzk0MjJdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNjQ2Mzg3MTcyNDkyNDc2OF0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjE0Njg2MjgyOTM5NTkyNzMyLDAuMzUzODYyNDMzODA4OTAzOCwwLjczNTI3ODkxMDcxNzI1MDgsMC44MzM2MjE5MTMxMzM0OTAxLDAuMTM0NTg0NDIxNDk0NzkxMSwwLjA2OTU3MTE2NjYyMzUzMjgsMC4wNTg5MTU3NDk2MTE0MjA1NCwwLjU5MTUwODIxMTMyNjk1NjcsMC44MTA2MDk5MDgxNzU2Njk1LDAuMDk1ODc2MzE3NDI1ODc4OTksMC45Nzc1Nzg5MTYyMTMwNTU3LDAuNjIwMDExMDAwMjUxMTM3XSxcIndoZWVsX3ZlcnRleFwiOlswLjIzODY5MTY0MzE3Mjk5MDYzLDAuNDY5NjA4MjA1MzQzNDI3ODQsMC45ODA5MjA5NDMzOTgwMjY4LDAuMDk0MDg3MTc1MTc1OTg5NTIsMC45NTk2MjI4NDU4NjE1NDk0LDAuMTQ5MzEwNjY1MDM4NTAxMiwwLjU0MjQxMTY5NDk4ODM0MTUsMC4zNTA2ODc2MjAzOTE0OTIzN10sXCJpbmRleFwiOjI2fSx7XCJpZFwiOlwiMC5pN2luNzEwZjM5OFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuMDEwNzQyNDM1MzU3MDY5OTgsMC4zNzQ5NjE1MDI0NDM5NTQ3Nl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMjE3NjExNjMwMzM5ODc1ODUsMC4yODc3MDY5MDQxNzI2Njk4Nl0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC43Nzg4NTA0Nzc0NzA4NzA3XSxcInZlcnRleF9saXN0XCI6WzAuOTA2NTA0NTI5NDUyNzA2MSwwLjA4MzIwMzA4MzQ5ODc1NzM4LDAuMDM0NjA4NjQ3MjgyNzgwNjgsMC4xMjg4NTQ1OTQ5ODIwMzc0NCwwLjcwMzYxMjAxMTM1ODkyOTcsMC44MzAxMTU4MTUxODU4NzEyLDAuMzk1Nzc2OTE1ODQ0MjcwMSwwLjk4OTc2MTQzNDUxODEzOTEsMC4wODA4ODE1MzcwNTYxOTU1LDAuOTQzNTQ2MDY2NzM1MTY4NSwwLjMwNzAyNjYxMzQ5MDE0MjcsMC4wNTUyMzM0NzEwMjYyNDM4NzRdLFwid2hlZWxfdmVydGV4XCI6WzAuMjI3MDYyNDA3ODYyOTAxMzMsMC40NTM2Mzg4Mjg1ODEzNDY2MywwLjQwNDMxMTA1NDMzODgwNzEsMC4wNDY2MjEzMzI2Nzg1NzM2LDAuMTczNzYxMzA1NDg3NzczMTMsMC42NDE5NDE2MDU1NDIyMTk2LDAuNDUwMzQxODIwNTM2Mzg4OTQsMC4wNjMwMzQ4NjQ5NTQ2MjM1Ml0sXCJpbmRleFwiOjI3fSx7XCJpZFwiOlwiMC45Nml2cXBwZWdhZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuNDkxMTE3OTIzMDkwMjAwNSwwLjM1MDQ2NDQ0NjkxOTM5MDk0XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4zMzUzNDQ0OTY3Mjg5NzAyNiwwLjkzMzUxNzY1ODAwMzI0MjddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMzE5NTc1Mzg2NjQxMTA1NzRdLFwidmVydGV4X2xpc3RcIjpbMC41OTI2MjU0ODczODU5MzUxLDAuNzE5MjA4Nzk5NTIyOTg0NiwwLjQ4NDQ5MTYzMDQ2OTM4ODI2LDAuNzgyMDc1NzYxNjIwODU4MiwwLjc0NjIwNTQzOTgyNDU3NzQsMC4wOTA0MjYyNDY1MzIwMzA0NiwwLjEwNzAyNTgxNTAzNTQ3OTkyLDAuOTA2MTg3ODc3MzYyNjk2MywwLjY1MjIyOTQxMjI4NDUyOTQsMC42NzcyNzExMzUxOTIzNDk3LDAuMDI0NTExNjkzNTUyMjQzODA3LDAuODA1NDU5MzE0MzA1ODM1NV0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4zNjAyOTgxMDQzODMzMzA2NSwwLjYwNjUyMzc2MDYyMzcxNDQsMC4zMjYwMjEzMjE3MTI0MjYzNywwLjU5NDA0MTU3MTkwNzY0MDYsMC41ODIxMDU4Njk0ODA0NDQyLDAuNjQ3NDY5MDgwMDY1MDEwNywwLjU5MDY1NjIyNTQ4MTc3MDIsMC40Nzc1NDg0Mzk5MzI2NTU5NF0sXCJpbmRleFwiOjI4fSx7XCJpZFwiOlwiMC5mZnE4ZGVwY2hwZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuMTk0MjQxMTQ0MDM3ODQ1NTQsMC40MTExNjE1MDI1NDY2NzU3XSxcIndoZWVsX2RlbnNpdHlcIjpbMC43MTYxMTE5NTI2OTY5MDM1LDAuOTIxMDkxNDIxODk3OTM2N10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC42NzI2MDY2NDI1ODc3NTk3XSxcInZlcnRleF9saXN0XCI6WzAuNjA4NzI1MTQ5MTc5MDYzMSwwLjcxMjY5MjI1NjM2MDgyOTgsMC4yODQ4MTMzMjE4MjQ1MDI4LDAuMjU3Nzc3ODkzMDU2MDI2NCwwLjkzMjI5MTc1MDU2MDg2OSwwLjI2MDI0NjM0Mzg2MTgwNDU2LDAuOTAwODYwODM2OTc1MTc0OSwwLjgxOTY4NjE3OTM0MDI2ODgsMC4wNDk3ODExMjgyNTA0NDYxMTYsMC40OTg0Njg5NjQ5OTE3NjA2MywwLjQyMjA2Nzc2MjY3OTg5ODc2LDAuMTMyODI2NDczODk5MTgyXSxcIndoZWVsX3ZlcnRleFwiOlswLjU1MjcwNzEyNzE2NDc0MzIsMC42MDA2NjYzMDkzOTE5MTQ3LDAuODg4ODcwNzY0Nzg0MzcxNCwwLjI0NDcyNzEzMDQxNjMwMjEyLDAuOTI2NDQ0OTM2Nzc4NjQ5NCwwLjAwODY3Mzk4MzIyMDM0Mjg1MSwwLjY1NjEyNjg2MzkzMDU5MzcsMC44MDA4Njk4NDA2MDE5MTVdLFwiaW5kZXhcIjoyOX0se1wiaWRcIjpcIjAuMzFrMWJzYTI5djhcIixcIndoZWVsX3JhZGl1c1wiOlswLjUyMTY1Nzk3MjMyMjY4ODQsMC42OTM4MDM4NzgyNTIwNTcyXSxcIndoZWVsX2RlbnNpdHlcIjpbMC43NTEwNTA0OTMwODQ2Mzc4LDAuOTM2MDIxMTY3MTY0MTMzOV0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC45OTE5NjkyNTQ3ODMzNTg1XSxcInZlcnRleF9saXN0XCI6WzAuNjIwMjI1MzQ1MDY2Mjc5OCwwLjg0MDg5MzI5MDIyODgwMjksMC4xNDY3MDc5OTU1NjA4OTQzLDAuOTg1MDQ1MDMwMTI0MTcyNCwwLjIzMzQ0NDk3NjE5MTIyMDMsMC4yODk3OTEyMzI3MzI1NDYwMywwLjI3MDkzODA4MDE3NTY3ODY2LDAuMTkwNzA0NjIzNzQ3ODM4OTIsMC4wNTMzNjA1OTc4Mjk0MjgyNiwwLjgyNzYwNzI5MjY2MzE4MywwLjkzMTkxMjM0MjE5MjU0OSwwLjQzNzY3MTc2Mjg1OTU3Njc2XSxcIndoZWVsX3ZlcnRleFwiOlswLjA0MTU4NjY5NDcyODY3MDcxNCwwLjA3Mjk4MjcxNzUxOTA4MDcsMC4wMTY5MTYxNTQ5MDUyOTA3NDgsMC40OTAxNDU0NTk4ODIzMjA1LDAuMjMxMTk4OTM2Nzk2NjU4MjYsMC4wMjUxMzAwNjgyMzIxNDkzNiwwLjQ4OTM4OTA5ODYzOTI1OTk1LDAuMzg4NDM1MDE3MDUzNzc0NV0sXCJpbmRleFwiOjMwfSx7XCJpZFwiOlwiMC45MGtrdmI0dWNob1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuOTEwMTAzNzk5Mjc4NTQ3MiwwLjQ4Nzg1OTI0NzAxMTU5MTJdLFwid2hlZWxfZGVuc2l0eVwiOlswLjM4NDg0Nzc5NzA4MjQ2MzEsMC40NTM4OTA0OTY5Nzk2MTIwM10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4yNjA4MDA3OTg5MzY5MzE2NF0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjUzMTc5MzIwNzU5MzUyMTQsMC42ODc4MTg5MzEwMjE0MTkxLDAuOTgwMzEwMTQ5MzcxMTE3NywwLjc2NTc1MTY1NTA1MzQzNCwwLjQwNjAxODcxODMyMTY5ODgsMC4xMTg0ODcyOTQ4OTA3Mjg1MSwwLjU3MzUyNDIyNTkwNzg1MjMsMC45ODg4MzczMTQwMTcxMzQzLDAuNjYzMTQyMTc0NzgyMDkxMSwwLjU0MzAzMjk4NjM2MjAyMTYsMC40NTk4Mjk5OTQzNTgzNjYxMywwLjg5Njk2NzY1MTcwMzYwMjNdLFwid2hlZWxfdmVydGV4XCI6WzAuNDA1NDU3MjYyMDg3ODQ5NiwwLjM4MTcwNTY1ODMzNTE2MSwwLjYyMzQ5NTE0NjIzODE2NTcsMC42NDMzMjg4NTU5NzM0NTM4LDAuODU3MjI4MjY2NDk3OTMyLDAuODk5NTU0OTc0MTE5OTM2NywwLjA3NjUxMTMyNzkzMjMxODg1LDAuNzcxMTc2NTI4Njk4NTM2OF0sXCJpbmRleFwiOjMxfSx7XCJpZFwiOlwiMC5hamd0Y2kzc2NnOFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuMzM1MTk0ODE0MDYxNzE4OSwwLjYyOTk3MzE4NzkwODc1MzhdLFwid2hlZWxfZGVuc2l0eVwiOlswLjQxNTM0MTg2ODEwMjg4NTU0LDAuMjcwNDQxMzUyNzIyMzA0Ml0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC43MDEzNzIzNTI2MjcxNTA5XSxcInZlcnRleF9saXN0XCI6WzAuNzQxNTc4MjU5MjY2OTEzOCwwLjYzNTI2NDQ0MzI5MTgyOTMsMC4xNzM2NjYwMjU5NjIxMDk2NywwLjUwNzIwNjc5MzQyNzQ5NzMsMC41OTE1NTYwNDMyMDEzODc1LDAuNDU0OTMwMTEzMjUxNjg0NTMsMC4yNjQ5NDA5MjMwNTI0NDkzLDAuNzU2MjExMDM1NjUyNDkyMywwLjA3ODUzMjkyMTY2ODEzNzQxLDAuNjE1NDM1ODc2MDc2MjcyMSwwLjgxODgwMzA5ODk4NTE4MDQsMC44NzQ4MzEwMzg5MTUzNDU3XSxcIndoZWVsX3ZlcnRleFwiOlswLjEwODYyMzQ5NzMxODA2MzA5LDAuNTg1NzYyMzY2ODQ3Nzg0NSwwLjQ3MzQwNzg2MDc5NzU3OTM1LDAuMjY2NjYxNjAxNTYxNDE0MDUsMC43MTE3MDI1OTMyODA2NTIyLDAuNTMzNDM5Mjg1MTI5NDk5OCwwLjk3NDAyMDQ3MTAzNDY4NzYsMC44MTE5NDg5NDExNDg0OTIxXSxcImluZGV4XCI6MzJ9LHtcImlkXCI6XCIwLmlqNm5sbGNjNmo4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4wNjU3NjUzNjA3MTg4Mzc3NiwwLjI2OTgxMzQ2MDYxNjg2NTZdLFwid2hlZWxfZGVuc2l0eVwiOlswLjEwODI2OTg4OTY0MTQyNzgxLDAuNDI4MDc5Mzg0MDYzOTc3Nl0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4xMjQ1MTc1MzU1NTg4OTA1Nl0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjk4NTkyNzY3NTY1OTE5ODEsMC4zMjM2MTU2MTc4MzE4MjU3LDAuMjM4ODE3MTA5ODkwNjA3MTIsMC45MDg1MDQ0ODM4MzEyOTg2LDAuMDc1OTA5MTg1MTkxNDMyODYsMC4xMTc4MzAyNjc2MTUwMTQ5MiwwLjc1NDU0OTQ3NDMxODAxMDgsMC45ODMwOTI2MjIyNjExODMzLDAuMjA1NTE5MDc0MzEyODc4MywwLjcwODQyNzM1NTM4OTE0MDUsMC42MTgwNzk4MTI0Nzc3MjI1LDAuMDM4Mzc2NTgzNzg4MDg0OTVdLFwid2hlZWxfdmVydGV4XCI6WzAuMjYyNTc5NTgzMjkzNjc4MTQsMC4zNzQyMjc1NjM0MzU0NDg4MywwLjk3MDY2MzcwOTc3MjM4MzgsMC44MjcwNDAyODcyOTE2OTc1LDAuNjQyMzQ3MDYwMjg2MTUyNywwLjMwNDk0Njk2MDM5MzY4NDEsMC4wMjAzMTU0MjQ0MjEwMjUwNzUsMC42NzMxNTQyMzE1NjkyMTk2XSxcImluZGV4XCI6MzN9LHtcImlkXCI6XCIwLmNmYW1qa2dlMTRcIixcIndoZWVsX3JhZGl1c1wiOlswLjU1NTMzNzEyMjM0NDEzMjYsMC40ODI1NTk1MjU0NTMwMTE5NV0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMTAyMzM1Njc5NTU5NTcxMTIsMC40MTE4NjYzOTk0NjA2NDYyXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjg1MDcwMTAzNzI0OTgyMDNdLFwidmVydGV4X2xpc3RcIjpbMC40NDM1NTI2MTQ0NDEwODE1LDAuNzk1MjU3MTE2MTIxNjAxNSwwLjY5NTY2NzQyOTg0ODE2OTgsMC43NzAwMzgxMTUwNDI2MjY4LDAuMDI0NDM3NzkxOTIyNjU3MjcsMC4zMzE0OTI0MjAyMjY0NTI0LDAuNTM0ODQ3Mjg3MjE3Njg5MywwLjE2OTk4OTgzNTg3MTE3NDQ0LDAuMzcwMjU2NzUzMTYzNjM1OCwwLjEzMjQ4ODcxMTA4MzU5Mzk1LDAuMzI0MjExNTI5MDgwODAyNTMsMC4xMjM4NDM4OTkzNTQyOTU4NV0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC41NTYyMzYxNzc3NDEzMTE4LDAuMDIwMTgxOTczMjczMDAwNDIsMC42NjU2NzczOTY2OTg2ODgyLDAuMzQwNTY3MDc1NDkxNjc4OTcsMC4zMjI4Njg3MjQ4MjgzMDMxLDAuMDA1NDY4OTYzMjgwNzkyMjcyLDAuMjQ4NzQxMzIzMTIzMTMxNjksMC4wMDc1NjgwMjk0MTczMjkyNThdLFwiaW5kZXhcIjozNH0se1wiaWRcIjpcIjAuODk3dXB1c3AwMG9cIixcIndoZWVsX3JhZGl1c1wiOlswLjk1MDYyMjEwNTc3MzkyODgsMC4yNjM0Njc4Mjg4Nzg3MjZdLFwid2hlZWxfZGVuc2l0eVwiOlswLjc4MTAxNjY0NTM0NjQzNzMsMC4zODY0Nzk5Mjk5ODg5ODIwNl0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4wNzM1NDIxODI1NzgxMjU1XSxcInZlcnRleF9saXN0XCI6WzAuMzMzNzMxMTQxMTU4NzExMTYsMC4wOTg2OTg2MTEyMTcyODI5NiwwLjE1NTU4NTUxNDY1MTkwMjUsMC4zMTc0ODczMTg3MjE3ODU1LDAuNDc1MjgyNjc3MDc3MzMyNiwwLjMyOTkxNTk4OTI3OTc2NTQsMC4xOTYwMDA5Nzk2NzUyNDU1NSwwLjE0OTI1MTcwOTY0MTk1NjMzLDAuMDA2ODY0NTI0MDUyNzEyOTg0LDAuNzUzMjQ4OTAxNzU1NDAyMywwLjQzODM1NDE3MjA1MjY3NiwwLjMxMTI0MDEyNDc3Njg1MjE1XSxcIndoZWVsX3ZlcnRleFwiOlswLjg0OTg2NzMzMjg5NTI1NzUsMC40ODgzMzI1MDEzOTYzMzM1NSwwLjcxNDgwMTY0NzU1NDI3NiwwLjg5ODcxMDQxMzYyODUxOTYsMC45Mzg0MTA4NDk0NzkyNjQ3LDAuODgzOTg1Mzg3NjQ5MTYzOSwwLjQxOTQwMTEwNTc1NjIxMjYsMC41MDIyNDc2OTQ5MDM2NDUyXSxcImluZGV4XCI6MzV9LHtcImlkXCI6XCIwLmV1Z3VlOXBjN3FvXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4xNDU4MDg3OTM4MjgxNDQ5MywwLjg3NDQwMDkzNzU4MTM0Ml0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMzUwNTc4MjYzNzY0NzQzNDQsMC40OTA4NTcxMjc1NzM3MTk0N10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC45MjYxNDQ5ODE3ODUwNTI3XSxcInZlcnRleF9saXN0XCI6WzAuMTY2OTAyNzk3ODE1NzE1NiwwLjI2ODg1MzA1NjEzNDgyNzksMC40MTAyMzc5MjkwMjA0NzkyLDAuNTgxNDI1OTU1NjQwNTU2OCwwLjQ0OTU3ODEyMzA5MDk2NjM0LDAuNzUwNzA4MzU3MjQxNjc0NCwwLjA3Mjg3NzczMzI5NzAxNTg2LDAuNzk3NDM2NzczNjYyNTcyNSwwLjA2ODQ2MTgwNzgzMDc3NTI3LDAuNzM0NDc1NDI5MTE5MTU0OSwwLjU3MDMwMjY3NTkzMjk2NzcsMC42Mjg5MzM1NTc0OTU1NjddLFwid2hlZWxfdmVydGV4XCI6WzAuNzkxNzE5MjMyODA4NjIyOSwwLjU3MDgwMTkwMjM2NTk2MjMsMC43NzY1MjUwMjA5MTU3OTMyLDAuMjkyNjQyMzQ2NjAxNDcyMjYsMC4yNzkzODkyMzM3ODk3NTM0NCwwLjE0MzQ4MTA2MTM1MTA2MDQyLDAuNTYwOTE2NzU1NTA4Nzg1NSwwLjUwNDc0NDI5MzgxOTIzMzldLFwiaW5kZXhcIjozNn0se1wiaWRcIjpcIjAubDZzY2w1bnRqZFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuMjQ1NTc4MTIxNDg3NTI1NjcsMC42NzQwNDk2MDQzNzA2ODgxXSxcIndoZWVsX2RlbnNpdHlcIjpbMC4wNzgwMDQ3ODc5MDYwMzY4MiwwLjUyMjQyOTU2NzMzODU0NTddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMDQ2MDg4NTExNzAzMjA1NDldLFwidmVydGV4X2xpc3RcIjpbMC4zMDc1MzUzMjU4MDY3MzA2LDAuOTQ2NDk3NDE5OTY3ODAyLDAuNDA2MjkyMjMwMjk0Mzg1NjYsMC4yNzYzNzQxMDc4OTgyMzg3LDAuMjU2NDA0NzQxMzI0NTQyNywwLjkzMTE1Mzg5OTMyNDAzODksMC42NDUzMjU0MTYzNDA1MzIyLDAuNjExNDc5NjgyODk2NDU0NCwwLjUzNzgyODI4ODM5MTAyNDQsMC4xOTkyMTYwOTg0NjY0NDUyOCwwLjk2NTM3ODUzNDUyNTAxOTQsMC4zOTc4OTA5Njg0OTkxNDYwN10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4xNzUyNjA2MzcxMTE5NjQwNSwwLjUyMTkyMjczNjQ3ODU3MTUsMC4xOTIyODQwMDgyODI4NTY1MiwwLjQ3NDcxMTk4MTIwODI4MzQsMC4xMjkzOTk1MTk3NjM3NjQwNywwLjk3MTkxNTc0NTkzMzY0MjMsMC4wNTg1NTA1NzU1MDAzMzk3MSwwLjE3MDExNjA2ODAwMzU5MDQ3XSxcImluZGV4XCI6Mzd9LHtcImlkXCI6XCIwLnNrcjZtbWkwc3VnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4xMzAxOTkwMzU5NTMxNTE3NCwwLjY5Nzg4NDc0MTIxNTMwODldLFwid2hlZWxfZGVuc2l0eVwiOlswLjkzODAzODM5MjkxNjgzNzksMC45MDA2MjYzMTUyNzk3NTk2XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjUzNjIxNTM1NzIyMTU0OTZdLFwidmVydGV4X2xpc3RcIjpbMC43ODk4NTMzMjAzNDUyMDMyLDAuMDQ4MjY5OTYwOTU5NTIxODUsMC4xMDQ2MTY5MDgwNzQzNjI4NiwwLjE5MTQzNTA4NjAwODQ5MTQ2LDAuODE4NzU2MTg0Njg5MjU0NCwwLjI1MzU3NjUwMTY1Njg0ODMsMC40NjQ0MjcxMDkzMTAzMTU0LDAuNzc0NzMyMTY2MzU2NTYwNSwwLjcxNTU4ODg1NjQwOTk1NjYsMC4yMjc3MzY4NDk4NTAyMDc0OCwwLjg3NjQwNDI0MDgwNjk3MTIsMC4yNTY1MDAxOTgyMjM0OTM1N10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC45NzQyMjQ1NDk2NTA3Mjg1LDAuMzg2NDk1MTUzNDYyODY1NTYsMC4zMzA3MDQ4MzEwMjcwOTcsMC44Njk1MTE3MzA3MjE3Mzc1LDAuODMyNDIxMzU1NjA5OTA3NCwwLjE4MTU3MzQxNzAwNDYwMDQsMC40MDY4NTI5MzcxNDc3NzcxNSwwLjM2Nzc0MDg1ODEzMTkzNjM1XSxcImluZGV4XCI6Mzh9LHtcImlkXCI6XCIwLjBib2Q4dWx2ZTU4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC41NjkwODM4MjAyMzU0MTU2LDAuMjQ5NDczMTc3MDcyMzM2NjNdLFwid2hlZWxfZGVuc2l0eVwiOlswLjUzMjcxNzI0NDI0MTYwOTUsMC41MjIxODMxNDk2MTc4NzU3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjg1ODYzODMwMzkyNzQzM10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjY1NDQxNjU4NDk4NTY3MDcsMC43OTIxNjcwNjU2MTIwNjk0LDAuMjI4MjgxMDE1OTE4ODY1NTIsMC42NjA4OTEwNTM2NTU4ODY3LDAuMDI1MjYwMzU2NDI4OTMxMDk3LDAuNzA0NDYxNDIwOTI3MTkyNCwwLjk3NjE5MDcyMjg5NjIxOTQsMC40NzExNjQ5MjA5MTQ2ODkzLDAuNTcyNzA1MDI3NTQ3MzU4NCwwLjgyNzI3NTY2MzUyMDQyNDEsMC4zOTgyNTU3MjE1MzQ1Mjg0LDAuNTQ2NzA4ODMzNDE1NjE0XSxcIndoZWVsX3ZlcnRleFwiOlswLjIwMjU1OTQ2NDE2NjgxNjAzLDAuMjgyNDU3OTkyMDc4MjI5MSwwLjMwMTg1MTg5NTA0MDYzNzI1LDAuNzM3MzA5MTkyMTI0MzQyMiwwLjgzNTMxMTM2MzkxNjk1NDUsMC44Nzg3MzA4MDYyNzA3NDM3LDAuMjAyMjMwMDQ0ODQ5MzAyODUsMC43ODEyNzY2NDQzNzg4OTU5XSxcImluZGV4XCI6Mzl9XX0iLCJ2YXIgY3JlYXRlID0gcmVxdWlyZShcIi4uL2NyZWF0ZS1pbnN0YW5jZVwiKTtcclxudmFyIHNlbGVjdGlvbiA9IHJlcXVpcmUoXCIuL3NlbGVjdGlvbi5qcy9cIik7XHJcbnZhciBtdXRhdGlvbiA9IHJlcXVpcmUoXCIuL211dGF0aW9uLmpzL1wiKTtcclxudmFyIGNyb3Nzb3ZlciA9IHJlcXVpcmUoXCIuL2Nyb3Nzb3Zlci5qcy9cIik7XHJcbnZhciBjbHVzdGVyID0gcmVxdWlyZShcIi4vY2x1c3RlcmluZy9jbHVzdGVyU2V0dXAuanMvXCIpO1xyXG52YXIgcmFuZG9tSW50ID0gcmVxdWlyZShcIi4vcmFuZG9tSW50LmpzL1wiKTtcclxudmFyIGdldFJhbmRvbUludCA9IHJhbmRvbUludC5nZXRSYW5kb21JbnQ7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBnZW5lcmF0aW9uWmVybzogZ2VuZXJhdGlvblplcm8sXHJcbiAgbmV4dEdlbmVyYXRpb246IG5leHRHZW5lcmF0aW9uXHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRpb25aZXJvKGNvbmZpZyl7XHJcbiAgdmFyIGdlbmVyYXRpb25TaXplID0gY29uZmlnLmdlbmVyYXRpb25TaXplLFxyXG4gIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWE7XHJcbiAgdmFyIHVzZUZpbGUgPSBmYWxzZTtcclxuICB2YXIgY3dfY2FyR2VuZXJhdGlvbiA9IFtdO1xyXG4gIGlmKHVzZUZpbGU9PT10cnVlKXtcclxuXHQgIGN3X2NhckdlbmVyYXRpb249IHJlYWRGaWxlKCk7XHJcbiAgfVxyXG4gIGVsc2Uge1xyXG5cdCAgZm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XHJcblx0XHR2YXIgZGVmID0gY3JlYXRlLmNyZWF0ZUdlbmVyYXRpb25aZXJvKHNjaGVtYSwgZnVuY3Rpb24oKXtcclxuXHRcdHJldHVybiBNYXRoLnJhbmRvbSgpXHJcblx0XHR9KTtcclxuXHRcdGRlZi5pbmRleCA9IGs7XHJcblx0XHRjd19jYXJHZW5lcmF0aW9uLnB1c2goZGVmKTtcclxuXHR9XHJcbiAgfVxyXG4gIHJldHVybiB7XHJcbiAgICBjb3VudGVyOiAwLFxyXG4gICAgZ2VuZXJhdGlvbjogY3dfY2FyR2VuZXJhdGlvbixcclxuICB9O1xyXG59XHJcblxyXG4vLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBteSBjb2RlIGpvYjY0XHJcbi8qVGhpcyBmdW5jdGlvbiBsb2FkcyBhbiBpbml0aWFsIGNhciBwb3B1bGF0aW9uIGZyb20gYSAuanNvbiBmaWxlKi9cclxuZnVuY3Rpb24gcmVhZEZpbGUoKXtcclxuXHR2YXIgZnMgPSByZXF1aXJlKCdmcycpO1xyXG5cdHZhciBhcnJheSA9IFtdO1xyXG5cdHZhciBmaWxlID0gcmVxdWlyZShcIi4vaW5pdGlhbENhcnMuanNvbi9cIik7XHJcblx0Zm9yKHZhciBpID0gMDtpPGZpbGUuYXJyYXkubGVuZ3RoO2krKyl7XHJcblx0XHRhcnJheS5wdXNoKGZpbGUuYXJyYXlbaV0pO1xyXG5cdH1cclxuXHRyZXR1cm4gYXJyYXk7XHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiBDaG9vc2VzIHdoaWNoIHNlbGVjdGlvbiBvcGVyYXRvciB0byB1c2UgaW4gdGhlIHNlbGVjdGlvbiBvZiB0d28gcGFyZW50cyBmb3IgdHdvIG5ldyBjYXJzIHN1Y2ggYXMgZWl0aGVyIFRvdXJuYW1lbnQgb3IgUm91bGV0dGUtd2hlZWwgc2VsZWN0aW9uXHJcbkBwYXJhbSBwYXJlbnRzIE9iamVjdEFycmF5IC0gQWRkaW5nIHRoZSBzZWxlY3RlZCBvYmplY3QgaW50byB0aGlzIGFycmF5XHJcbkBwYXJhbSBzY29yZXMgT2JqZWN0QXJyYXkgLSBBbiBhcnJheSBvZiBjYXJzIHdoZXJlIHRoZSBwYXJlbnRzIHdpbGwgYmUgc2VsZWN0ZWQgZnJvbVxyXG5AcGFyYW0gaW5jcmVhc2VNYXRlIEJvb2xlYW4gLSBXaGV0aGVyIHRoZSBjdXJyZW50IHNlbGVjdGlvbiB3aWxsIGluY2x1ZGUgYW4gZWxpdGUgd2hlcmUgaWYgdHJ1ZSBpdCB3b250IGJlIGRlbGV0ZWQgZnJvbSB0aGUgT2JqZWN0IGFycmF5IGFsbG93aW5nIGl0IHRvIGJlIHVzZWQgYWdhaW5cclxuQHJldHVybiBwYXJlbnRzU2NvcmUgaW50IC0gcmV0dXJucyB0aGUgYXZlcmFnZSBzY29yZSBvZiB0aGUgcGFyZW50cyovXHJcbmZ1bmN0aW9uIHNlbGVjdFBhcmVudHMocGFyZW50cywgc2NvcmVzLCBpbmNyZWFzZU1hdGUpe1xyXG5cdHZhciBwYXJlbnQxID0gc2VsZWN0aW9uLnJ1blNlbGVjdGlvbihzY29yZXMsKGluY3JlYXNlTWF0ZT09PWZhbHNlKT8xOjIsdHJ1ZSwgdHJ1ZSwgZmFsc2UpO1xyXG5cdHBhcmVudHMucHVzaChwYXJlbnQxLmRlZik7XHJcblx0aWYoaW5jcmVhc2VNYXRlPT09ZmFsc2Upe1xyXG5cdFx0c2NvcmVzLnNwbGljZShzY29yZXMuZmluZEluZGV4KHg9PiB4LmRlZi5pZD09PXBhcmVudHNbMF0uaWQpLDEpO1xyXG5cdH1cclxuXHR2YXIgcGFyZW50MiA9IHNlbGVjdGlvbi5ydW5TZWxlY3Rpb24oc2NvcmVzLChpbmNyZWFzZU1hdGU9PT1mYWxzZSk/MToyLHRydWUsIHRydWUsIGZhbHNlKTtcclxuXHRwYXJlbnRzLnB1c2gocGFyZW50Mi5kZWYpO1xyXG5cdHNjb3Jlcy5zcGxpY2Uoc2NvcmVzLmZpbmRJbmRleCh4PT4geC5kZWYuaWQ9PT1wYXJlbnRzWzFdLmlkKSwxKTtcclxuXHRyZXR1cm4gKHBhcmVudDEuc2NvcmUucyArIHBhcmVudDIuc2NvcmUucykvMjtcclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHJ1bnMgYSBFdm9sdXRpb25hcnkgYWxnb3JpdGhtIHdoaWNoIHVzZXMgU2VsZWN0aW9uLCBDcm9zc292ZXIgYW5kIG11dGF0aW9ucyB0byBjcmVhdGUgdGhlIG5ldyBwb3B1bGF0aW9ucyBvZiBjYXJzLlxyXG5AcGFyYW0gc2NvcmVzIE9iamVjdEFycmF5IC0gQW4gYXJyYXkgd2hpY2ggaG9sZHMgdGhlIGNhciBvYmplY3RzIGFuZCB0aGVyZSBwZXJmb3JtYW5jZSBzY29yZXNcclxuQHBhcmFtIGNvbmZpZyAtIFRoaXMgaXMgdGhlIGdlbmVyYXRpb25Db25maWcgZmlsZSBwYXNzZWQgdGhyb3VnaCB3aGljaCBnaXZlcyB0aGUgY2FycyB0ZW1wbGF0ZS9ibHVlcHJpbnQgZm9yIGNyZWF0aW9uXHJcbkBwYXJhbSBub0NhcnNDcmVhdGVkIGludCAtIFRoZSBudW1iZXIgb2YgY2FycyB0aGVyZSBjdXJyZW50bHkgZXhpc3QgdXNlZCBmb3IgY3JlYXRpbmcgdGhlIGlkIG9mIG5ldyBjYXJzXHJcbkByZXR1cm4gbmV3R2VuZXJhdGlvbiBPYmplY3RBcnJheSAtIGlzIHJldHVybmVkIHdpdGggYWxsIHRoZSBuZXdseSBjcmVhdGVkIGNhcnMgdGhhdCB3aWxsIGJlIGluIHRoZSBzaW11bGF0aW9uKi9cclxuZnVuY3Rpb24gcnVuRUEoc2NvcmVzLCBjb25maWcsIG5vQ2Fyc0NyZWF0ZWQpe1xyXG5cdHNjb3Jlcy5zb3J0KGZ1bmN0aW9uKGEsIGIpe3JldHVybiBiLnNjb3JlLnMgLSBhLnNjb3JlLnM7fSk7XHJcblx0dmFyIGdlbmVyYXRpb25TaXplPXNjb3Jlcy5sZW5ndGg7XHJcblx0dmFyIG5ld0dlbmVyYXRpb24gPSBuZXcgQXJyYXkoKTtcclxuXHR2YXIgcmFuZG9tTWF0ZUluY3JlYXNlID0gZ2V0UmFuZG9tSW50KDAsbWF4Tm9NYXRlc0luY3JlYXNlcywgbmV3IEFycmF5KCkpO1xyXG5cdHZhciBtYXhOb01hdGVzSW5jcmVhc2VzID0gMDtcclxuXHR2YXIgY3VycmVudE5vTWF0ZUluY3JlYXNlcyA9IDE7XHJcblx0dmFyIG5vRWxpdGVzPTM7XHJcblx0Zm9yKHZhciBpPTA7aTxub0VsaXRlcztpKyspey8vYWRkIG5ldyBlbGl0ZXMgdG8gbmV3R2VuZXJhdGlvblxyXG5cdFx0dmFyIG5ld0VsaXRlID0gc2NvcmVzWzBdLmRlZjtcclxuXHRcdG5ld0VsaXRlLmVsaXRlID0gdHJ1ZTtcclxuXHRcdG5ld0dlbmVyYXRpb24ucHVzaChuZXdFbGl0ZSk7XHJcblx0fVxyXG5cdGZvcih2YXIgayA9IDA7azxnZW5lcmF0aW9uU2l6ZS8yO2srKyl7XHJcblx0XHRpZihuZXdHZW5lcmF0aW9uLmxlbmd0aCE9PWdlbmVyYXRpb25TaXplKXtcclxuXHRcdHZhciBwaWNrZWRQYXJlbnRzID0gW107XHJcblx0XHR2YXIgcGFyZW50c1Njb3JlID0gc2VsZWN0UGFyZW50cyhwaWNrZWRQYXJlbnRzLCBzY29yZXMsICgoaz09PXJhbmRvbU1hdGVJbmNyZWFzZSkmJihjdXJyZW50Tm9NYXRlSW5jcmVhc2VzPG1heE5vTWF0ZXNJbmNyZWFzZXMpKT90cnVlOmZhbHNlKTsgXHJcblx0XHRpZihjdXJyZW50Tm9NYXRlSW5jcmVhc2VzPG1heE5vTWF0ZXNJbmNyZWFzZXMpe2N1cnJlbnROb01hdGVJbmNyZWFzZXMrKzt9XHJcblx0XHRcdHZhciBuZXdDYXJzID0gY3Jvc3NvdmVyLnJ1bkNyb3Nzb3ZlcihwaWNrZWRQYXJlbnRzLDAsY29uZmlnLnNjaGVtYSwgcGFyZW50c1Njb3JlLCBub0NhcnNDcmVhdGVkLCAobmV3R2VuZXJhdGlvbi5sZW5ndGg9PT1nZW5lcmF0aW9uU2l6ZS0xKT8xOjIpO1xyXG5cdFx0XHRmb3IodmFyIGk9MDtpPG5ld0NhcnMubGVuZ3RoO2krKyl7XHJcblx0XHRcdFx0bmV3Q2Fyc1tpXS5lbGl0ZSA9IGZhbHNlO1xyXG5cdFx0XHRcdG5ld0NhcnNbaV0uaW5kZXggPSBrO1xyXG5cdFx0XHRcdG5ld0dlbmVyYXRpb24ucHVzaChuZXdDYXJzW2ldKTtcclxuXHRcdFx0XHRub0NhcnNDcmVhdGVkKys7Ly8gdXNlZCBpbiBjYXIgaWQgY3JlYXRpb25cclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdH1cdFxyXG5cdG5ld0dlbmVyYXRpb24uc29ydChmdW5jdGlvbihhLCBiKXtyZXR1cm4gYS5wYXJlbnRzU2NvcmUgLSBiLnBhcmVudHNTY29yZTt9KTtcclxuXHRmb3IodmFyIHggPSAwO3g8bmV3R2VuZXJhdGlvbi5sZW5ndGg7eCsrKXtcclxuXHRcdFx0dmFyIGN1cnJlbnRJRCA9IG5ld0dlbmVyYXRpb25beF0uaWQ7XHJcblx0XHRcdGlmKG5ld0dlbmVyYXRpb25beF0uZWxpdGU9PT1mYWxzZSl7XHJcblx0XHRcdFx0Ly9uZXdHZW5lcmF0aW9uW3hdID0gbXV0YXRpb24ubXVsdGlNdXRhdGlvbnMobmV3R2VuZXJhdGlvblt4XSxuZXdHZW5lcmF0aW9uLmZpbmRJbmRleCh4PT4geC5pZD09PWN1cnJlbnRJRCksMjApO1xyXG5cdFx0XHRcdG5ld0dlbmVyYXRpb25beF0gPSBtdXRhdGlvbi5tdXRhdGUobmV3R2VuZXJhdGlvblt4XSk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGNvbnNvbGUubG9nKG5ld0dlbmVyYXRpb24pO1xyXG5cdHJldHVybiBuZXdHZW5lcmF0aW9uO1xyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gcnVucyB0aGUgQmFzZWxpbmUgRXZvbHV0aW9uYXJ5IGFsZ29yaXRobSB3aGljaCBvbmx5IHJ1bnMgYSBtdXRhdGlvbiBvciBtdWx0aU11dGF0aW9ucyBvdmVyIGFsbCB0aGUgY2FycyBwYXNzZWQgdGhvdWdoIGluIHRoZSBzY29yZXMgcGFyYW1ldGVyLlxyXG5AcGFyYW0gc2NvcmVzIEFycmF5IC0gVGhpcyBwYXJhbWV0ZXIgaXMgYW4gYXJyYXkgb2YgY2FycyB0aGF0IGhvbGRzIHRoZSBzY29yZSBzdGF0aXN0aWNzIGFuZCBjYXIgZGF0YSBzdWNoIGFzIGlkIGFuZCBcIndoZWVsX3JhZGl1c1wiLCBcImNoYXNzaXNfZGVuc2l0eVwiLCBcInZlcnRleF9saXN0XCIsIFwid2hlZWxfdmVydGV4XCIgYW5kIFwid2hlZWxfZGVuc2l0eVwiXHJcbkBwYXJhbSBjb25maWcgLSBUaGlzIHBhc3NlcyBhIGZpbGUgd2l0aCBmdW5jdGlvbnMgdGhhdCBjYW4gYmUgY2FsbGVkLlxyXG5AcmV0dXJuIG5ld0dlbmVyYXRpb24gLSB0aGlzIGlzIHRoZSBuZXcgcG9wdWxhdGlvbiB0aGF0IGhhdmUgaGFkIG11dGF0aW9ucyBhcHBsaWVkIHRvIHRoZW0uKi9cclxuZnVuY3Rpb24gcnVuQmFzZWxpbmVFQShzY29yZXMsIGNvbmZpZyl7XHJcblx0c2NvcmVzLnNvcnQoZnVuY3Rpb24oYSwgYil7cmV0dXJuIGEuc2NvcmUucyAtIGIuc2NvcmUuczt9KTtcclxuXHR2YXIgc2NoZW1hID0gY29uZmlnLnNjaGVtYTsvL2xpc3Qgb2YgY2FyIHZhcmlhYmxlcyBpLmUgXCJ3aGVlbF9yYWRpdXNcIiwgXCJjaGFzc2lzX2RlbnNpdHlcIiwgXCJ2ZXJ0ZXhfbGlzdFwiLCBcIndoZWVsX3ZlcnRleFwiIGFuZCBcIndoZWVsX2RlbnNpdHlcIlxyXG5cdHZhciBuZXdHZW5lcmF0aW9uID0gbmV3IEFycmF5KCk7XHJcblx0dmFyIGdlbmVyYXRpb25TaXplPXNjb3Jlcy5sZW5ndGg7XHJcblx0Y29uc29sZS5sb2coc2NvcmVzKTsvL3Rlc3QgZGF0YVxyXG5cdGZvciAodmFyIGsgPSAwOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xyXG5cdFx0Ly9uZXdHZW5lcmF0aW9uLnB1c2gobXV0YXRpb24ubXV0YXRlKHNjb3Jlc1trXS5kZWYpKTtcclxuXHRcdG5ld0dlbmVyYXRpb24ucHVzaChtdXRhdGlvbi5tdWx0aU11dGF0aW9ucyhzY29yZXNba10uZGVmLHNjb3Jlcy5maW5kSW5kZXgoeD0+IHguZGVmLmlkPT09c2NvcmVzW2tdLmRlZi5pZCksMjApKTtcclxuXHRcdG5ld0dlbmVyYXRpb25ba10uaXNfZWxpdGUgPSBmYWxzZTtcclxuXHRcdG5ld0dlbmVyYXRpb25ba10uaW5kZXggPSBrO1xyXG5cdH1cclxuXHRcclxuXHRyZXR1cm4gbmV3R2VuZXJhdGlvbjtcclxufVx0XHJcblxyXG4vKlxyXG5UaGlzIGZ1bmN0aW9uIGhhbmRsZXMgdGhlIGNob29zaW5nIG9mIHdoaWNoIEV2b2x1dGlvbmFyeSBhbGdvcml0aG0gdG8gcnVuIGFuZCByZXR1cm5zIHRoZSBuZXcgcG9wdWxhdGlvbiB0byB0aGUgc2ltdWxhdGlvbiovXHJcbmZ1bmN0aW9uIG5leHRHZW5lcmF0aW9uKHByZXZpb3VzU3RhdGUsIHNjb3JlcywgY29uZmlnKXtcclxuXHR2YXIgZ2VuZXJhdGlvblNpemU9c2NvcmVzLmxlbmd0aDtcclxuXHR2YXIgbmV3R2VuZXJhdGlvbiA9IG5ldyBBcnJheSgpO1xyXG5cdHZhciBjb3VudDtcclxuXHR2YXIgdGVtcFJvdW5kPTA7XHJcblx0XHJcblx0XHR0ZW1wUm91bmQ9KHR5cGVvZiBwcmV2aW91c1N0YXRlLnJvdW5kID09PVwidW5kZWZpbmVkXCIpPzA6cHJldmlvdXNTdGF0ZS5yb3VuZDtcclxuXHRcdGNvdW50ID0gcHJldmlvdXNTdGF0ZS5jb3VudGVyICsgMTtcclxuXHRcdC8vdmFyIGNsdXN0ZXJJbnQgPSAocHJldmlvdXNTdGF0ZS5jb3VudGVyPT09MCk/Y2x1c3Rlci5zZXR1cChzY29yZXMsbnVsbCxmYWxzZSk6Y2x1c3Rlci5zZXR1cChzY29yZXMscHJldmlvdXNTdGF0ZS5jbHVzdCx0cnVlKTtcclxuXHRcdC8vY2x1c3Rlci5yZVNjb3JlQ2FycyhzY29yZXMgLGNsdXN0ZXJJbnQpO1xyXG5cdFx0c2NvcmVzLnNvcnQoZnVuY3Rpb24oYSwgYil7cmV0dXJuIGEuc2NvcmUucyAtIGIuc2NvcmUuczt9KTtcclxuXHRcdHZhciBudW1iZXJPZkNhcnMgPSAocHJldmlvdXNTdGF0ZS5jb3VudGVyPT09MCk/Z2VuZXJhdGlvblNpemU6cHJldmlvdXNTdGF0ZS5ub0NhcnMrZ2VuZXJhdGlvblNpemU7XHJcblx0XHR2YXIgc2NoZW1hID0gY29uZmlnLnNjaGVtYTsvL2xpc3Qgb2YgY2FyIHZhcmlhYmxlcyBpLmUgXCJ3aGVlbF9yYWRpdXNcIiwgXCJjaGFzc2lzX2RlbnNpdHlcIiwgXCJ2ZXJ0ZXhfbGlzdFwiLCBcIndoZWVsX3ZlcnRleFwiXHJcblx0XHJcblx0XHRjb25zb2xlLmxvZyhcIkxvZyAtLSBcIitwcmV2aW91c1N0YXRlLmNvdW50ZXIpO1xyXG5cdFx0Ly9jb25zb2xlLmxvZyhzY29yZXNEYXRhKTsvL3Rlc3QgZGF0YVxyXG5cdFx0dmFyIGVhVHlwZSA9IDE7XHJcblx0XHRuZXdHZW5lcmF0aW9uID0gKGVhVHlwZT09PTEpP3J1bkVBKHNjb3JlcywgY29uZmlnLCBudW1iZXJPZkNhcnMsIHByZXZpb3VzU3RhdGUuc3RhdGVBdmVyYWdlc0Fycik6cnVuQmFzZWxpbmVFQShzY29yZXMsIGNvbmZpZyk7XHJcblx0XHQvL2NvbnNvbGUubG9nKG5ld0dlbmVyYXRpb24pOy8vdGVzdCBkYXRhXHJcblx0aWYocHJldmlvdXNTdGF0ZS5jb3VudGVyPjE1MCl7XHJcblx0XHRjb3VudD0wO1xyXG5cdFx0dGVtcFJvdW5kKys7XHJcblx0XHQvL25ld0dlbmVyYXRpb249Z2VuZXJhdGlvblplcm8oY29uZmlnKS5nZW5lcmF0aW9uO1xyXG5cdFx0XHJcblx0fVxyXG5cdFxyXG4gIHJldHVybiB7XHJcbiAgICBjb3VudGVyOiBjb3VudCxcclxuICAgIGdlbmVyYXRpb246IG5ld0dlbmVyYXRpb24sXHJcblx0Ly9jbHVzdDogY2x1c3RlckludCxcclxuXHRub0NhcnM6IG51bWJlck9mQ2FycyxcclxuXHRyb3VuZDogdGVtcFJvdW5kXHJcbiAgfTtcclxufVxyXG5cclxuXHJcbi8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tIGVuZCBvZiBteSBjb2RlIGpvYjY0XHJcblxyXG5cclxuZnVuY3Rpb24gbWFrZUNoaWxkKGNvbmZpZywgcGFyZW50cyl7XHJcbiAgdmFyIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWEsXHJcbiAgICBwaWNrUGFyZW50ID0gY29uZmlnLnBpY2tQYXJlbnQ7XHJcbiAgcmV0dXJuIGNyZWF0ZS5jcmVhdGVDcm9zc0JyZWVkKHNjaGVtYSwgcGFyZW50cywgcGlja1BhcmVudClcclxufVxyXG5cclxuXHJcblxyXG5mdW5jdGlvbiBtdXRhdGUoY29uZmlnLCBwYXJlbnQpe1xyXG4gIHZhciBzY2hlbWEgPSBjb25maWcuc2NoZW1hLFxyXG4gICAgbXV0YXRpb25fcmFuZ2UgPSBjb25maWcubXV0YXRpb25fcmFuZ2UsXHJcbiAgICBnZW5fbXV0YXRpb24gPSBjb25maWcuZ2VuX211dGF0aW9uLFxyXG4gICAgZ2VuZXJhdGVSYW5kb20gPSBjb25maWcuZ2VuZXJhdGVSYW5kb207XHJcbiAgcmV0dXJuIGNyZWF0ZS5jcmVhdGVNdXRhdGVkQ2xvbmUoXHJcbiAgICBzY2hlbWEsXHJcbiAgICBnZW5lcmF0ZVJhbmRvbSxcclxuICAgIHBhcmVudCxcclxuICAgIE1hdGgubWF4KG11dGF0aW9uX3JhbmdlKSxcclxuICAgIGdlbl9tdXRhdGlvblxyXG4gIClcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRtdXRhdGU6IG11dGF0ZSxcclxuXHRtdWx0aU11dGF0aW9uczogbXVsdGlNdXRhdGlvbnNcclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHJldHVybnMgd2hvbGUgaW50cyBiZXR3ZWVuIGEgbWluaW11bSBhbmQgbWF4aW11bVxyXG5AcGFyYW0gbWluIGludCAtIFRoZSBtaW5pbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbWF4IGludCAtIFRoZSBtYXhpbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbm90RXF1YWxzQXJyIGludEFycmF5IC0gQW4gYXJyYXkgb2YgdGhlIGludHMgdGhhdCB0aGUgZnVuY3Rpb24gc2hvdWxkIG5vdCByZXR1cm5cclxuQHJldHVybiBpbnQgLSBUaGUgaW50IHdpdGhpbiB0aGUgc3BlY2lmaWVkIHBhcmFtZXRlciBib3VuZHMgaXMgcmV0dXJuZWQuKi9cclxuZnVuY3Rpb24gZ2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpIHtcclxuXHR2YXIgdG9SZXR1cm47XHJcblx0dmFyIHJ1bkxvb3AgPSB0cnVlO1xyXG5cdHdoaWxlKHJ1bkxvb3A9PT10cnVlKXtcclxuXHRcdG1pbiA9IE1hdGguY2VpbChtaW4pO1xyXG5cdFx0bWF4ID0gTWF0aC5mbG9vcihtYXgpO1xyXG5cdFx0dG9SZXR1cm4gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xyXG5cdFx0aWYodHlwZW9mIGZpbmRJZkV4aXN0cyA9PT0gXCJ1bmRlZmluZWRcIil7XHJcblx0XHRcdHJ1bkxvb3A9ZmFsc2U7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKG5vdEVxdWFsc0Fyci5maW5kKGZ1bmN0aW9uKHZhbHVlKXtyZXR1cm4gdmFsdWU9PT10b1JldHVybjt9KT09PWZhbHNlKXtcclxuXHRcdFx0cnVuTG9vcD1mYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcbiAgICByZXR1cm4gdG9SZXR1cm47Ly8odHlwZW9mIGZpbmRJZkV4aXN0cyA9PT0gXCJ1bmRlZmluZWRcIik/dG9SZXR1cm46Z2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gY2hhbmdlQXJyYXlWYWx1ZShvcmlnaW5hbFZhbHVlKXtcclxuXHRmb3IodmFyIGk9MDtpPG9yaWdpbmFsVmFsdWUubGVuZ3RoO2krKyl7XHJcblx0XHR2YXIgcmFuZG9tRmxvYXQgPSBNYXRoLnJhbmRvbSgpO1xyXG5cdFx0dmFyIG11dGF0aW9uUmF0ZSA9IDAuNSpyYW5kb21GbG9hdDsvL01hdGgucmFuZG9tKCk7XHJcblx0XHR2YXIgaW5jcmVhc2VPckRlY3JlYXNlID0gZ2V0UmFuZG9tSW50KDAsMSxbXSk7XHJcblx0XHRuZXdWYWx1ZSA9IChpbmNyZWFzZU9yRGVjcmVhc2U9PT0wKT9vcmlnaW5hbFZhbHVlW2ldLW11dGF0aW9uUmF0ZTpvcmlnaW5hbFZhbHVlW2ldK211dGF0aW9uUmF0ZTtcclxuXHRcdGlmKG5ld1ZhbHVlPDApe1xyXG5cdFx0XHRuZXdWYWx1ZSA9IG9yaWdpbmFsVmFsdWVbaV0rbXV0YXRpb25SYXRlO1xyXG5cdFx0fSBlbHNlIGlmKG5ld1ZhbHVlPjEpe1xyXG5cdFx0XHRuZXdWYWx1ZSA9IG9yaWdpbmFsVmFsdWVbaV0tbXV0YXRpb25SYXRlO1xyXG5cdFx0fVxyXG5cdFx0b3JpZ2luYWxWYWx1ZVtpXSA9IG5ld1ZhbHVlO1xyXG5cdH1cclxuXHRyZXR1cm4gb3JpZ2luYWxWYWx1ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gbXV0YXRlKGNhcil7XHJcblx0cmV0dXJuIGNoYW5nZURhdGEoY2FyLG5ldyBBcnJheSgpLDEpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjaGFuZ2VEYXRhKGNhciwgbXVsdGlNdXRhdGlvbnMsIG5vTXV0YXRpb25zKXtcclxuXHR2YXIgcmFuZG9tSW50ID0gZ2V0UmFuZG9tSW50KDEsNCwgbXVsdGlNdXRhdGlvbnMpO1xyXG5cdGlmKHJhbmRvbUludD09PTEpe1xyXG5cdFx0Y2FyLmNoYXNzaXNfZGVuc2l0eT1jaGFuZ2VBcnJheVZhbHVlKGNhci5jaGFzc2lzX2RlbnNpdHkpO1xyXG5cdH1cclxuXHRlbHNlIGlmKHJhbmRvbUludD09PTIpe1xyXG5cdFx0Y2FyLnZlcnRleF9saXN0PWNoYW5nZUFycmF5VmFsdWUoY2FyLnZlcnRleF9saXN0KTtcclxuXHR9XHJcblx0ZWxzZSBpZihyYW5kb21JbnQ9PT0zKXtcclxuXHRcdGNhci53aGVlbF9kZW5zaXR5PWNoYW5nZUFycmF5VmFsdWUoY2FyLndoZWVsX2RlbnNpdHkpO1xyXG5cdH1cclxuXHRlbHNlIGlmKHJhbmRvbUludD09PTQpe1xyXG5cdFx0Y2FyLndoZWVsX3JhZGl1cz1jaGFuZ2VBcnJheVZhbHVlKGNhci53aGVlbF9yYWRpdXMpO1xyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdGNhci53aGVlbF92ZXJ0ZXg9Y2hhbmdlQXJyYXlWYWx1ZShjYXIud2hlZWxfdmVydGV4KTtcclxuXHR9XHJcblx0bXVsdGlNdXRhdGlvbnMucHVzaChyYW5kb21JbnQpO1xyXG5cdG5vTXV0YXRpb25zLS07XHJcblx0cmV0dXJuIChub011dGF0aW9ucz09PTApP2NhcjpjaGFuZ2VEYXRhKGNhciwgbXVsdGlNdXRhdGlvbnMsIG5vTXV0YXRpb25zKTtcclxufVxyXG5cclxuZnVuY3Rpb24gbXVsdGlNdXRhdGlvbnMoY2FyLCBhcnJQb3NpdGlvbiwgYXJyU2l6ZSl7XHJcblx0Ly92YXIgbm9NdXRhdGlvbnMgPSAoYXJyUG9zaXRpb248KGFyclNpemUvMikpPyhhcnJQb3NpdGlvbjwoYXJyU2l6ZS80KSk/NDozOihhcnJQb3NpdGlvbj5hcnJTaXplLShhcnJTaXplLzQpKT8xOjI7XHJcblx0dmFyIG5vTXV0YXRpb25zID0gKGFyclBvc2l0aW9uPDEwKT8zOjE7XHJcblx0cmV0dXJuIGNoYW5nZURhdGEoY2FyLCBuZXcgQXJyYXkoKSxub011dGF0aW9ucyk7XHJcbn0iLCIgbW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0Z2V0UmFuZG9tSW50OiBnZXRSYW5kb21JbnRcclxuIH1cclxuIFxyXG4vKlRoaXMgaXMgYSByZWN1cnNpdmUgZnVuY3Rpb24gd2hpY2ggcmV0dXJucyB3aG9sZSBpbnRzIGJldHdlZW4gYSBtaW5pbXVtIGFuZCBtYXhpbXVtXHJcbkBwYXJhbSBtaW4gaW50IC0gVGhlIG1pbmltdW0gaW50IHRoYXQgY2FuIGJlIHJldHVybmVkXHJcbkBwYXJhbSBtYXggaW50IC0gVGhlIG1heGltdW0gaW50IHRoYXQgY2FuIGJlIHJldHVybmVkXHJcbkBwYXJhbSBub3RFcXVhbHNBcnIgaW50QXJyYXkgLSBBbiBhcnJheSBvZiB0aGUgaW50cyB0aGF0IHRoZSBmdW5jdGlvbiBzaG91bGQgbm90IHJldHVyblxyXG5AcmV0dXJuIGludCAtIFRoZSBpbnQgd2l0aGluIHRoZSBzcGVjaWZpZWQgcGFyYW1ldGVyIGJvdW5kcyBpcyByZXR1cm5lZC4qL1xyXG5mdW5jdGlvbiBnZXRSYW5kb21JbnQobWluLCBtYXgsIG5vdEVxdWFsc0Fycikge1xyXG5cdHZhciB0b1JldHVybjtcclxuXHR2YXIgcnVuTG9vcCA9IHRydWU7XHJcblx0d2hpbGUocnVuTG9vcD09PXRydWUpe1xyXG5cdFx0bWluID0gTWF0aC5jZWlsKG1pbik7XHJcblx0XHRtYXggPSBNYXRoLmZsb29yKG1heCk7XHJcblx0XHR0b1JldHVybiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XHJcblx0XHRpZih0eXBlb2YgZmluZElmRXhpc3RzID09PSBcInVuZGVmaW5lZFwiKXtcclxuXHRcdFx0cnVuTG9vcD1mYWxzZTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYobm90RXF1YWxzQXJyLmZpbmQoZnVuY3Rpb24odmFsdWUpe3JldHVybiB2YWx1ZT09PXRvUmV0dXJuO30pPT09ZmFsc2Upe1xyXG5cdFx0XHRydW5Mb29wPWZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuICAgIHJldHVybiB0b1JldHVybjsvLyh0eXBlb2YgZmluZElmRXhpc3RzID09PSBcInVuZGVmaW5lZFwiKT90b1JldHVybjpnZXRSYW5kb21JbnQobWluLCBtYXgsIG5vdEVxdWFsc0Fycik7XHJcbn0iLCIvL3ZhciByYW5kb21JbnQgPSByZXF1aXJlKFwiLi9yYW5kb21JbnQuanMvXCIpO1xyXG4vL3ZhciBnZXRSYW5kb21JbnQgPSByYW5kb21JbnQuZ2V0UmFuZG9tSW50O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0cnVuU2VsZWN0aW9uOiBydW5TZWxlY3Rpb25cclxufVxyXG4vKlxyXG5UaGlzIGZ1bmN0aW9uIGNoYW5nZXMgdGhlIHR5cGUgb2Ygc2VsZWN0aW9uIHVzZWQgZGVwZW5kaW5nIG9uIHRoZSBwYXJhbWV0ZXIgbnVtYmVyIFwic2VsZWN0VHlwZVwiID0gKHJvdWxldGVXaGVlbFNlbCAtIDEsIHRvdXJuYW1lbnRTZWxlY3Rpb24gLSAyKVxyXG5AcGFyYW0gc3Ryb25nZXN0IGJvb2xlYW4gIC0gdGhpcyBwYXJhbWV0ZXIgaXMgcGFzc2VkIHRocm91Z2ggdG8gdGhlIHRvdXJuYW1lbnRTZWxlY3Rpb24gZnVuY3Rpb24gd2hlcmUgdHJ1ZSBpcyByZXR1cm4gdGhlIHN0cm9uZ2VzdCBhbmQgZmFsc2UgZ2V0IHdlYWtlc3RcclxuQHBhcmFtIHNlbGVjdFR5cGUgaW50IC0gdGhpcyBwYXJhbWV0ZXIgZGV0ZXJtaW5lcyB0aGUgdHlwZSBvZiBzZWxlY3Rpb24gdXNlZC5cclxuQHBhcmFtIGNhcnNBcnIgQXJyYXkgLSB0aGlzIHBhcmFtZXRlciBpcyB0aGUgcG9wdWxhdGlvbiB3aGljaCB0aGUgc2VsZWN0aW9uIGZ1bmN0aW9ucyBhcmUgdXNlZCBvbi5cclxuQHBhcmFtIHVzZVN1YlNldCBib29sZWFuIC0gdHJ1ZSBpZiB5b3Ugd2FudCB0b3VybmFtZW50U2VsZWN0aW9uIHRvIHVzZSBzdWIgc2V0cyBub3QgdGhlIGdsb2JhbCBwb3B1bGF0aW9uXHJcbkByZXR1cm4gT2JqZWN0QXJyYXkgLSB0aGUgcGFyZW50cyBhcnJheSBvZiB0d28gaXMgcmV0dXJuZWQgZnJvbSBlaXRoZXIgdG91cm5hbWVudCBvciByb3VsbGV0ZSB3aGVlbCBzZWxlY3Rpb24qL1xyXG5mdW5jdGlvbiBydW5TZWxlY3Rpb24oY2Fyc0Fyciwgc2VsZWN0VHlwZSwgc3Ryb25nZXN0LCB1c2VTdWJTZXQsIHVuaWZvcm0pe1xyXG5cdGlmKHNlbGVjdFR5cGU9PT0xKXtcclxuXHRcdHJldHVybiByb3VsZXRlV2hlZWxTZWwoY2Fyc0FyciwgdW5pZm9ybSk7XHJcblx0fSBcclxuXHRlbHNlIGlmKHNlbGVjdFR5cGU9PT0yKXtcclxuXHRcdHJldHVybiB0b3VybmFtZW50U2VsZWN0aW9uKGNhcnNBcnIsc3Ryb25nZXN0LGNhcnNBcnIubGVuZ3RoLzQsIHVzZVN1YlNldCk7XHJcblx0fVxyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gdXNlcyBmaW5lc3MgcHJvcG9ydGlvbmF0ZSBzZWxlY3Rpb24gd2hlcmUgYSBwcm9wb3J0aW9uIG9mIHRoZSB3aGVlbCBpcyBnaXZlbiB0byBhIGNhciBiYXNlZCBvbiBmaXRuZXNzXHJcbkBwYXJhbSBjYXJzQXJyIE9iamVjdEFycmF5IC0gVGhlIGFycmF5IG9mIGNhcnMgd2hlcmUgdGhlIHBhcmVudHMgYXJlIGNob3NlbiBmcm9tXHJcbkBwYXJhbSB1bmlmb3JtIGJvb2xlYW4gLSB3aGV0aGVyIHRoZSBzZWxlY3Rpb24gc2hvdWxkIGJlIHVuaWZvcm1cclxuQHJldHVybiBjYXIgT2JqZWN0IC0gQSBjYXIgb2JqZWN0IGlzIHJldHVybmVkIGFmdGVyIHNlbGVjdGlvbiovXHJcbmZ1bmN0aW9uIHJvdWxldGVXaGVlbFNlbChjYXJzQXJyLCB1bmlmb3JtKXtcclxuXHRpZih1bmlmb3JtID09PWZhbHNlKXtcclxuXHRcdHZhciBzdW1DYXJTY29yZSA9IDA7XHJcblx0XHRmb3IodmFyIGkgPTA7aTxjYXJzQXJyLmxlbmd0aDtpKyspe1xyXG5cdFx0XHRzdW1DYXJTY29yZSArPSBjYXJzQXJyW2ldLnNjb3JlLnM7XHJcblx0XHR9XHJcblx0XHQvKmNvbnNvbGUubG9nKFwic2VsZWN0aW9uIGRhdGEgLVwiKTtcclxuXHRcdGNvbnNvbGUubG9nKGNhcnNBcnIubGVuZ3RoKTtcclxuXHRcdGNvbnNvbGUubG9nKHN1bUNhclNjb3JlKTsvL3Rlc3Qgbm9cclxuXHRcdCovXHJcblx0XHR2YXIgbm8gPSBNYXRoLnJhbmRvbSgpICogc3VtQ2FyU2NvcmU7XHJcblx0XHRpZihzdW1DYXJTY29yZSE9MCl7XHJcblx0XHRcdGZvcih2YXIgeCA9MDt4PGNhcnNBcnIubGVuZ3RoO3grKyl7XHJcblx0XHRcdFx0bm8gLT0gY2Fyc0Fyclt4XS5zY29yZS5zO1xyXG5cdFx0XHRcdGlmKG5vPDApe1xyXG5cdFx0XHRcdFx0Ly9jb25zb2xlLmxvZyhjYXJzQXJyW3hdKTsvL3JldHVybmVkIGNhclxyXG5cdFx0XHRcdFx0cmV0dXJuIGNhcnNBcnJbeF07XHJcblx0XHRcdFx0fVxyXG5cdFx0XHRcdFxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0XHRlbHNle1xyXG5cdFx0XHRyZXR1cm4gY2Fyc0FyclswXTtcclxuXHRcdH1cclxuXHR9IGVsc2Uge1xyXG5cdFx0dmFyIHJhbmRObyA9IGdldFJhbmRvbUludCgwLCBjYXJzQXJyLmxlbmd0aC0xLFtdKTtcclxuXHRcdHJldHVybiBjYXJzQXJyW3JhbmROb107XHJcblx0fVxyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gdXNlcyB0b3VybmFtZW50U2VsZWN0aW9uIHdoZXJlIGEgYXJyYXkgaXMgc29ydGVkIGFuZCB0aGUgc3Ryb25nZXN0IG9yIHdlYWtlc3QgaXMgcmV0dXJuZWRcclxuQHBhcmFtIGNhcnNBcnIgT2JqZWN0QXJyYXkgLSBUaGUgYXJyYXkgb2YgY2FycyB3aGVyZSB0aGUgcGFyZW50cyBhcmUgY2hvc2VuIGZyb21cclxuQHBhcmFtIHN0cm9uZ2VzdCBCb29sZWFuIC0gaWYgdHJ1ZSB0aGUgc3Ryb25nZXN0IGNhciBpcyBjaG9zZW4sIGVsc2UgaWYgZmFsc2UgdGhlIHdlYWtlc3QgaXMgcmV0dXJuZWQgXHJcbkBwYXJhbSBzdWJTZXRSYW5nZSBpbnQgLSBIb3cgYmlnIHRoZSBzdWJTZXQgb2YgdGhlIGdsb2JhbCBhcnJheSBzaG91bGQgYmVcclxuQHBhcmFtIHVzZVN1YlNldCBib29sZWFuIC0gdHJ1ZSBpZiB5b3Ugd2FudCB0byB1c2Ugc3ViIHNldCBvZiByYW5kb21seSBjaG9zZW4gb2JqZWN0cyBmcm9tIHRoZSBnbG9iYWwsIG9yIGZhbHNlIHRvIGp1c3QgdXNlIHRoZSBnbG9iYWxcclxuQHJldHVybiBjYXIgT2JqZWN0IC0gQSBjYXIgb2JqZWN0IGlzIHJldHVybmVkIGFmdGVyIHNlbGVjdGlvbiovXHJcbmZ1bmN0aW9uIHRvdXJuYW1lbnRTZWxlY3Rpb24oY2Fyc0Fyciwgc3Ryb25nZXN0LCBzdWJTZXRSYW5nZSwgdXNlU3ViU2V0KXtcclxuXHR2YXIgc3ViU2V0ID0gW107XHJcblx0aWYodXNlU3ViU2V0PT09dHJ1ZSl7XHJcblx0dmFyIGNob3NlbkludHMgPSBbXTtcclxuXHRmb3IodmFyIGkgPTA7aTxzdWJTZXRSYW5nZTtpKyspe1xyXG5cdFx0dmFyIGNob3Nlbk5vID0gZ2V0UmFuZG9tSW50KDAsY2Fyc0Fyci5sZW5ndGgtMSxjaG9zZW5JbnRzKTtcclxuXHRcdGNob3NlbkludHMucHVzaChjaG9zZW5Obyk7XHJcblx0XHRzdWJTZXQucHVzaChjYXJzQXJyW2Nob3Nlbk5vXSk7XHJcblx0fVxyXG5cdH1cclxuXHQodXNlU3ViU2V0PT09dHJ1ZSk/c3ViU2V0OmNhcnNBcnIuc29ydChmdW5jdGlvbihhLGIpe3JldHVybiAoc3Ryb25nZXN0PT09dHJ1ZSk/Yi5zY29yZS5zIC0gYS5zY29yZS5zOmEuc2NvcmUucyAtIGEuc2NvcmUuYjt9KTtcclxuXHRyZXR1cm4gKHVzZVN1YlNldD09PXRydWUpP3N1YlNldFswXTpjYXJzQXJyWzBdO1xyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gcmV0dXJucyB3aG9sZSBpbnRzIGJldHdlZW4gYSBtaW5pbXVtIGFuZCBtYXhpbXVtXHJcbkBwYXJhbSBtaW4gaW50IC0gVGhlIG1pbmltdW0gaW50IHRoYXQgY2FuIGJlIHJldHVybmVkXHJcbkBwYXJhbSBtYXggaW50IC0gVGhlIG1heGltdW0gaW50IHRoYXQgY2FuIGJlIHJldHVybmVkXHJcbkBwYXJhbSBub3RFcXVhbHNBcnIgaW50QXJyYXkgLSBBbiBhcnJheSBvZiB0aGUgaW50cyB0aGF0IHRoZSBmdW5jdGlvbiBzaG91bGQgbm90IHJldHVyblxyXG5AcmV0dXJuIGludCAtIFRoZSBpbnQgd2l0aGluIHRoZSBzcGVjaWZpZWQgcGFyYW1ldGVyIGJvdW5kcyBpcyByZXR1cm5lZC4qL1xyXG5mdW5jdGlvbiBnZXRSYW5kb21JbnQobWluLCBtYXgsIG5vdEVxdWFsc0Fycikge1xyXG5cdHZhciB0b1JldHVybjtcclxuXHR2YXIgcnVuTG9vcCA9IHRydWU7XHJcblx0d2hpbGUocnVuTG9vcD09PXRydWUpe1xyXG5cdFx0bWluID0gTWF0aC5jZWlsKG1pbik7XHJcblx0XHRtYXggPSBNYXRoLmZsb29yKG1heCk7XHJcblx0XHR0b1JldHVybiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XHJcblx0XHRpZih0eXBlb2YgZmluZElmRXhpc3RzID09PSBcInVuZGVmaW5lZFwiKXtcclxuXHRcdFx0cnVuTG9vcD1mYWxzZTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYobm90RXF1YWxzQXJyLmZpbmQoZnVuY3Rpb24odmFsdWUpe3JldHVybiB2YWx1ZT09PXRvUmV0dXJuO30pPT09ZmFsc2Upe1xyXG5cdFx0XHRydW5Mb29wPWZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuICAgIHJldHVybiB0b1JldHVybjsvLyh0eXBlb2YgZmluZElmRXhpc3RzID09PSBcInVuZGVmaW5lZFwiKT90b1JldHVybjpnZXRSYW5kb21JbnQobWluLCBtYXgsIG5vdEVxdWFsc0Fycik7XHJcbn1cclxuXHJcbiIsIlxuXG5jb25zdCByYW5kb20gPSB7XG4gIHNodWZmbGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3Ipe1xuICAgIHJldHVybiByYW5kb20ubWFwVG9TaHVmZmxlKHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcbiAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGggfHwgMTAsXG4gICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgfSwgZ2VuZXJhdG9yKSk7XG4gIH0sXG4gIGNyZWF0ZUludGVnZXJzKHByb3AsIGdlbmVyYXRvcil7XG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0ludGVnZXIocHJvcCwgcmFuZG9tLmNyZWF0ZU5vcm1hbHMoe1xuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aCxcbiAgICAgIGluY2x1c2l2ZTogdHJ1ZSxcbiAgICB9LCBnZW5lcmF0b3IpKTtcbiAgfSxcbiAgY3JlYXRlRmxvYXRzKHByb3AsIGdlbmVyYXRvcil7XG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0Zsb2F0KHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcbiAgICAgIGxlbmd0aDogcHJvcC5sZW5ndGgsXG4gICAgICBpbmNsdXNpdmU6IHRydWUsXG4gICAgfSwgZ2VuZXJhdG9yKSk7XG4gIH0sXG4gIGNyZWF0ZU5vcm1hbHMocHJvcCwgZ2VuZXJhdG9yKXtcbiAgICB2YXIgbCA9IHByb3AubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXMgPSBbXTtcbiAgICBmb3IodmFyIGkgPSAwOyBpIDwgbDsgaSsrKXtcbiAgICAgIHZhbHVlcy5wdXNoKFxuICAgICAgICBjcmVhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yKVxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbiAgfSxcbiAgbXV0YXRlU2h1ZmZsZShcbiAgICBwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGVcbiAgKXtcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvU2h1ZmZsZShwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcbiAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxuICAgICkpO1xuICB9LFxuICBtdXRhdGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGUpe1xuICAgIHJldHVybiByYW5kb20ubWFwVG9JbnRlZ2VyKHByb3AsIHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxuICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlXG4gICAgKSk7XG4gIH0sXG4gIG11dGF0ZUZsb2F0cyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGUpe1xuICAgIHJldHVybiByYW5kb20ubWFwVG9GbG9hdChwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcbiAgICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxuICAgICkpO1xuICB9LFxuICBtYXBUb1NodWZmbGUocHJvcCwgbm9ybWFscyl7XG4gICAgdmFyIG9mZnNldCA9IHByb3Aub2Zmc2V0IHx8IDA7XG4gICAgdmFyIGxpbWl0ID0gcHJvcC5saW1pdCB8fCBwcm9wLmxlbmd0aDtcbiAgICB2YXIgc29ydGVkID0gbm9ybWFscy5zbGljZSgpLnNvcnQoZnVuY3Rpb24oYSwgYil7XG4gICAgICByZXR1cm4gYSAtIGI7XG4gICAgfSk7XG4gICAgcmV0dXJuIG5vcm1hbHMubWFwKGZ1bmN0aW9uKHZhbCl7XG4gICAgICByZXR1cm4gc29ydGVkLmluZGV4T2YodmFsKTtcbiAgICB9KS5tYXAoZnVuY3Rpb24oaSl7XG4gICAgICByZXR1cm4gaSArIG9mZnNldDtcbiAgICB9KS5zbGljZSgwLCBsaW1pdCk7XG4gIH0sXG4gIG1hcFRvSW50ZWdlcihwcm9wLCBub3JtYWxzKXtcbiAgICBwcm9wID0ge1xuICAgICAgbWluOiBwcm9wLm1pbiB8fCAwLFxuICAgICAgcmFuZ2U6IHByb3AucmFuZ2UgfHwgMTAsXG4gICAgICBsZW5ndGg6IHByb3AubGVuZ3RoXG4gICAgfVxuICAgIHJldHVybiByYW5kb20ubWFwVG9GbG9hdChwcm9wLCBub3JtYWxzKS5tYXAoZnVuY3Rpb24oZmxvYXQpe1xuICAgICAgcmV0dXJuIE1hdGgucm91bmQoZmxvYXQpO1xuICAgIH0pO1xuICB9LFxuICBtYXBUb0Zsb2F0KHByb3AsIG5vcm1hbHMpe1xuICAgIHByb3AgPSB7XG4gICAgICBtaW46IHByb3AubWluIHx8IDAsXG4gICAgICByYW5nZTogcHJvcC5yYW5nZSB8fCAxXG4gICAgfVxuICAgIHJldHVybiBub3JtYWxzLm1hcChmdW5jdGlvbihub3JtYWwpe1xuICAgICAgdmFyIG1pbiA9IHByb3AubWluO1xuICAgICAgdmFyIHJhbmdlID0gcHJvcC5yYW5nZTtcbiAgICAgIHJldHVybiBtaW4gKyBub3JtYWwgKiByYW5nZVxuICAgIH0pXG4gIH0sXG4gIG11dGF0ZU5vcm1hbHMocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlKXtcbiAgICB2YXIgZmFjdG9yID0gKHByb3AuZmFjdG9yIHx8IDEpICogbXV0YXRpb25fcmFuZ2VcbiAgICByZXR1cm4gb3JpZ2luYWxWYWx1ZXMubWFwKGZ1bmN0aW9uKG9yaWdpbmFsVmFsdWUpe1xuICAgICAgaWYoZ2VuZXJhdG9yKCkgPiBjaGFuY2VUb011dGF0ZSl7XG4gICAgICAgIHJldHVybiBvcmlnaW5hbFZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG11dGF0ZU5vcm1hbChcbiAgICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlLCBmYWN0b3JcbiAgICAgICk7XG4gICAgfSk7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gcmFuZG9tO1xuXG5mdW5jdGlvbiBtdXRhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlLCBtdXRhdGlvbl9yYW5nZSl7XG4gIGlmKG11dGF0aW9uX3JhbmdlID4gMSl7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IG11dGF0ZSBiZXlvbmQgYm91bmRzXCIpO1xuICB9XG4gIHZhciBuZXdNaW4gPSBvcmlnaW5hbFZhbHVlIC0gMC41O1xuICBpZiAobmV3TWluIDwgMCkgbmV3TWluID0gMDtcbiAgaWYgKG5ld01pbiArIG11dGF0aW9uX3JhbmdlICA+IDEpXG4gICAgbmV3TWluID0gMSAtIG11dGF0aW9uX3JhbmdlO1xuICB2YXIgcmFuZ2VWYWx1ZSA9IGNyZWF0ZU5vcm1hbCh7XG4gICAgaW5jbHVzaXZlOiB0cnVlLFxuICB9LCBnZW5lcmF0b3IpO1xuICByZXR1cm4gbmV3TWluICsgcmFuZ2VWYWx1ZSAqIG11dGF0aW9uX3JhbmdlO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVOb3JtYWwocHJvcCwgZ2VuZXJhdG9yKXtcbiAgaWYoIXByb3AuaW5jbHVzaXZlKXtcbiAgICByZXR1cm4gZ2VuZXJhdG9yKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIGdlbmVyYXRvcigpIDwgMC41ID9cbiAgICBnZW5lcmF0b3IoKSA6XG4gICAgMSAtIGdlbmVyYXRvcigpO1xuICB9XG59XG4iLCIvKiBnbG9iYWxzIGJ0b2EgKi9cbnZhciBzZXR1cFNjZW5lID0gcmVxdWlyZShcIi4vc2V0dXAtc2NlbmVcIik7XG52YXIgY2FyUnVuID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvcnVuXCIpO1xudmFyIGRlZlRvQ2FyID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvZGVmLXRvLWNhclwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSBydW5EZWZzO1xuZnVuY3Rpb24gcnVuRGVmcyh3b3JsZF9kZWYsIGRlZnMsIGxpc3RlbmVycykge1xuICBpZiAod29ybGRfZGVmLm11dGFibGVfZmxvb3IpIHtcbiAgICAvLyBHSE9TVCBESVNBQkxFRFxuICAgIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBidG9hKE1hdGguc2VlZHJhbmRvbSgpKTtcbiAgfVxuXG4gIHZhciBzY2VuZSA9IHNldHVwU2NlbmUod29ybGRfZGVmKTtcbiAgc2NlbmUud29ybGQuU3RlcCgxIC8gd29ybGRfZGVmLmJveDJkZnBzLCAyMCwgMjApO1xuICBjb25zb2xlLmxvZyhcImFib3V0IHRvIGJ1aWxkIGNhcnNcIik7XG4gIHZhciBjYXJzID0gZGVmcy5tYXAoKGRlZiwgaSkgPT4ge1xuICAgIHJldHVybiB7XG4gICAgICBpbmRleDogaSxcbiAgICAgIGRlZjogZGVmLFxuICAgICAgY2FyOiBkZWZUb0NhcihkZWYsIHNjZW5lLndvcmxkLCB3b3JsZF9kZWYpLFxuICAgICAgc3RhdGU6IGNhclJ1bi5nZXRJbml0aWFsU3RhdGUod29ybGRfZGVmKVxuICAgIH07XG4gIH0pO1xuICB2YXIgYWxpdmVjYXJzID0gY2FycztcbiAgcmV0dXJuIHtcbiAgICBzY2VuZTogc2NlbmUsXG4gICAgY2FyczogY2FycyxcbiAgICBzdGVwOiBmdW5jdGlvbiAoKSB7XG4gICAgICBpZiAoYWxpdmVjYXJzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJubyBtb3JlIGNhcnNcIik7XG4gICAgICB9XG4gICAgICBzY2VuZS53b3JsZC5TdGVwKDEgLyB3b3JsZF9kZWYuYm94MmRmcHMsIDIwLCAyMCk7XG4gICAgICBsaXN0ZW5lcnMucHJlQ2FyU3RlcCgpO1xuICAgICAgYWxpdmVjYXJzID0gYWxpdmVjYXJzLmZpbHRlcihmdW5jdGlvbiAoY2FyKSB7XG4gICAgICAgIGNhci5zdGF0ZSA9IGNhclJ1bi51cGRhdGVTdGF0ZShcbiAgICAgICAgICB3b3JsZF9kZWYsIGNhci5jYXIsIGNhci5zdGF0ZVxuICAgICAgICApO1xuICAgICAgICB2YXIgc3RhdHVzID0gY2FyUnVuLmdldFN0YXR1cyhjYXIuc3RhdGUsIHdvcmxkX2RlZik7XG4gICAgICAgIGxpc3RlbmVycy5jYXJTdGVwKGNhcik7XG4gICAgICAgIGlmIChzdGF0dXMgPT09IDApIHtcbiAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfVxuICAgICAgICBjYXIuc2NvcmUgPSBjYXJSdW4uY2FsY3VsYXRlU2NvcmUoY2FyLnN0YXRlLCB3b3JsZF9kZWYpO1xuICAgICAgICBsaXN0ZW5lcnMuY2FyRGVhdGgoY2FyKTtcblxuICAgICAgICB2YXIgd29ybGQgPSBzY2VuZS53b3JsZDtcbiAgICAgICAgdmFyIHdvcmxkQ2FyID0gY2FyLmNhcjtcbiAgICAgICAgd29ybGQuRGVzdHJveUJvZHkod29ybGRDYXIuY2hhc3Npcyk7XG5cbiAgICAgICAgZm9yICh2YXIgdyA9IDA7IHcgPCB3b3JsZENhci53aGVlbHMubGVuZ3RoOyB3KyspIHtcbiAgICAgICAgICB3b3JsZC5EZXN0cm95Qm9keSh3b3JsZENhci53aGVlbHNbd10pO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSlcbiAgICAgIGlmIChhbGl2ZWNhcnMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIGxpc3RlbmVycy5nZW5lcmF0aW9uRW5kKGNhcnMpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG59XG4iLCIvKiBnbG9iYWxzIGIyV29ybGQgYjJWZWMyIGIyQm9keURlZiBiMkZpeHR1cmVEZWYgYjJQb2x5Z29uU2hhcGUgKi9cblxuLypcblxud29ybGRfZGVmID0ge1xuICBncmF2aXR5OiB7eCwgeX0sXG4gIGRvU2xlZXA6IGJvb2xlYW4sXG4gIGZsb29yc2VlZDogc3RyaW5nLFxuICB0aWxlRGltZW5zaW9ucyxcbiAgbWF4Rmxvb3JUaWxlcyxcbiAgbXV0YWJsZV9mbG9vcjogYm9vbGVhblxufVxuXG4qL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHdvcmxkX2RlZil7XG5cbiAgdmFyIHdvcmxkID0gbmV3IGIyV29ybGQod29ybGRfZGVmLmdyYXZpdHksIHdvcmxkX2RlZi5kb1NsZWVwKTtcbiAgdmFyIGZsb29yVGlsZXMgPSBjd19jcmVhdGVGbG9vcihcbiAgICB3b3JsZCxcbiAgICB3b3JsZF9kZWYuZmxvb3JzZWVkLFxuICAgIHdvcmxkX2RlZi50aWxlRGltZW5zaW9ucyxcbiAgICB3b3JsZF9kZWYubWF4Rmxvb3JUaWxlcyxcbiAgICB3b3JsZF9kZWYubXV0YWJsZV9mbG9vclxuICApO1xuXG4gIHZhciBsYXN0X3RpbGUgPSBmbG9vclRpbGVzW1xuICAgIGZsb29yVGlsZXMubGVuZ3RoIC0gMVxuICBdO1xuICB2YXIgbGFzdF9maXh0dXJlID0gbGFzdF90aWxlLkdldEZpeHR1cmVMaXN0KCk7XG4gIHZhciB0aWxlX3Bvc2l0aW9uID0gbGFzdF90aWxlLkdldFdvcmxkUG9pbnQoXG4gICAgbGFzdF9maXh0dXJlLkdldFNoYXBlKCkubV92ZXJ0aWNlc1szXVxuICApO1xuICB3b3JsZC5maW5pc2hMaW5lID0gdGlsZV9wb3NpdGlvbi54O1xuICByZXR1cm4ge1xuICAgIHdvcmxkOiB3b3JsZCxcbiAgICBmbG9vclRpbGVzOiBmbG9vclRpbGVzLFxuICAgIGZpbmlzaExpbmU6IHRpbGVfcG9zaXRpb24ueFxuICB9O1xufVxuXG5mdW5jdGlvbiBjd19jcmVhdGVGbG9vcih3b3JsZCwgZmxvb3JzZWVkLCBkaW1lbnNpb25zLCBtYXhGbG9vclRpbGVzLCBtdXRhYmxlX2Zsb29yKSB7XG4gIHZhciBsYXN0X3RpbGUgPSBudWxsO1xuICB2YXIgdGlsZV9wb3NpdGlvbiA9IG5ldyBiMlZlYzIoLTUsIDApO1xuICB2YXIgY3dfZmxvb3JUaWxlcyA9IFtdO1xuICBNYXRoLnNlZWRyYW5kb20oZmxvb3JzZWVkKTtcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBtYXhGbG9vclRpbGVzOyBrKyspIHtcbiAgICBpZiAoIW11dGFibGVfZmxvb3IpIHtcbiAgICAgIC8vIGtlZXAgb2xkIGltcG9zc2libGUgdHJhY2tzIGlmIG5vdCB1c2luZyBtdXRhYmxlIGZsb29yc1xuICAgICAgbGFzdF90aWxlID0gY3dfY3JlYXRlRmxvb3JUaWxlKFxuICAgICAgICB3b3JsZCwgZGltZW5zaW9ucywgdGlsZV9wb3NpdGlvbiwgKE1hdGgucmFuZG9tKCkgKiAzIC0gMS41KSAqIDEuNSAqIGsgLyBtYXhGbG9vclRpbGVzXG4gICAgICApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBpZiBwYXRoIGlzIG11dGFibGUgb3ZlciByYWNlcywgY3JlYXRlIHNtb290aGVyIHRyYWNrc1xuICAgICAgbGFzdF90aWxlID0gY3dfY3JlYXRlRmxvb3JUaWxlKFxuICAgICAgICB3b3JsZCwgZGltZW5zaW9ucywgdGlsZV9wb3NpdGlvbiwgKE1hdGgucmFuZG9tKCkgKiAzIC0gMS41KSAqIDEuMiAqIGsgLyBtYXhGbG9vclRpbGVzXG4gICAgICApO1xuICAgIH1cbiAgICBjd19mbG9vclRpbGVzLnB1c2gobGFzdF90aWxlKTtcbiAgICB2YXIgbGFzdF9maXh0dXJlID0gbGFzdF90aWxlLkdldEZpeHR1cmVMaXN0KCk7XG4gICAgdGlsZV9wb3NpdGlvbiA9IGxhc3RfdGlsZS5HZXRXb3JsZFBvaW50KGxhc3RfZml4dHVyZS5HZXRTaGFwZSgpLm1fdmVydGljZXNbM10pO1xuICB9XG4gIHJldHVybiBjd19mbG9vclRpbGVzO1xufVxuXG5cbmZ1bmN0aW9uIGN3X2NyZWF0ZUZsb29yVGlsZSh3b3JsZCwgZGltLCBwb3NpdGlvbiwgYW5nbGUpIHtcbiAgdmFyIGJvZHlfZGVmID0gbmV3IGIyQm9keURlZigpO1xuXG4gIGJvZHlfZGVmLnBvc2l0aW9uLlNldChwb3NpdGlvbi54LCBwb3NpdGlvbi55KTtcbiAgdmFyIGJvZHkgPSB3b3JsZC5DcmVhdGVCb2R5KGJvZHlfZGVmKTtcbiAgdmFyIGZpeF9kZWYgPSBuZXcgYjJGaXh0dXJlRGVmKCk7XG4gIGZpeF9kZWYuc2hhcGUgPSBuZXcgYjJQb2x5Z29uU2hhcGUoKTtcbiAgZml4X2RlZi5mcmljdGlvbiA9IDAuNTtcblxuICB2YXIgY29vcmRzID0gbmV3IEFycmF5KCk7XG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoMCwgMCkpO1xuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKDAsIC1kaW0ueSkpO1xuICBjb29yZHMucHVzaChuZXcgYjJWZWMyKGRpbS54LCAtZGltLnkpKTtcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMihkaW0ueCwgMCkpO1xuXG4gIHZhciBjZW50ZXIgPSBuZXcgYjJWZWMyKDAsIDApO1xuXG4gIHZhciBuZXdjb29yZHMgPSBjd19yb3RhdGVGbG9vclRpbGUoY29vcmRzLCBjZW50ZXIsIGFuZ2xlKTtcblxuICBmaXhfZGVmLnNoYXBlLlNldEFzQXJyYXkobmV3Y29vcmRzKTtcblxuICBib2R5LkNyZWF0ZUZpeHR1cmUoZml4X2RlZik7XG4gIHJldHVybiBib2R5O1xufVxuXG5mdW5jdGlvbiBjd19yb3RhdGVGbG9vclRpbGUoY29vcmRzLCBjZW50ZXIsIGFuZ2xlKSB7XG4gIHJldHVybiBjb29yZHMubWFwKGZ1bmN0aW9uKGNvb3JkKXtcbiAgICByZXR1cm4ge1xuICAgICAgeDogTWF0aC5jb3MoYW5nbGUpICogKGNvb3JkLnggLSBjZW50ZXIueCkgLSBNYXRoLnNpbihhbmdsZSkgKiAoY29vcmQueSAtIGNlbnRlci55KSArIGNlbnRlci54LFxuICAgICAgeTogTWF0aC5zaW4oYW5nbGUpICogKGNvb3JkLnggLSBjZW50ZXIueCkgKyBNYXRoLmNvcyhhbmdsZSkgKiAoY29vcmQueSAtIGNlbnRlci55KSArIGNlbnRlci55LFxuICAgIH07XG4gIH0pO1xufVxuIl19
