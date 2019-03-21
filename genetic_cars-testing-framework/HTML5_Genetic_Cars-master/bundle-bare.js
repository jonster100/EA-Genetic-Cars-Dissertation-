(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
/* globals document confirm btoa */
/* globals b2Vec2 */
// Global Vars

var worldRun = require("./world/run.js");

var graph_fns = require("./draw/plot-graphs.js");
var plot_graphs = graph_fns.plotGraphs;


// ======= WORLD STATE ======

var $graphList = document.querySelector("#graph-list");
var $graphTemplate = document.querySelector("#graph-template");

function stringToHTML(s){
  var temp = document.createElement('div');
  temp.innerHTML = s;
  return temp.children[0];
}

var states, runners, results, graphState = {};

function updateUI(key, scores){
  var $graph = $graphList.querySelector("#graph-" + key);
  var $newGraph = stringToHTML($graphTemplate.innerHTML);
  $newGraph.id = "graph-" + key;
  if($graph){
    $graphList.replaceChild($graph, $newGraph);
  } else {
    $graphList.appendChild($newGraph);
  }
  console.log($newGraph);
  var scatterPlotElem = $newGraph.querySelector(".scatterplot");
  scatterPlotElem.id = "graph-" + key + "-scatter";
  graphState[key] = plot_graphs(
    $newGraph.querySelector(".graphcanvas"),
    $newGraph.querySelector(".topscores"),
    scatterPlotElem,
    graphState[key],
    scores,
    {}
  );
}

var generationConfig = require("./generation-config");

var box2dfps = 60;
var max_car_health = box2dfps * 10;

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

var manageRound = {
  genetic: require("./machine-learning/genetic-algorithm/manage-round.js"),
  annealing: require("./machine-learning/simulated-annealing/manage-round.js"),
};

var createListeners = function(key){
  return {
    preCarStep: function(){},
    carStep: function(){},
    carDeath: function(carInfo){
      carInfo.score.i = states[key].counter;
    },
    generationEnd: function(results){
      handleRoundEnd(key, results);
    }
  }
}

function generationZero(){
  var obj = Object.keys(manageRound).reduce(function(obj, key){
    obj.states[key] = manageRound[key].generationZero(generationConfig());
    obj.runners[key] = worldRun(
      world_def, obj.states[key].generation, createListeners(key)
    );
    obj.results[key] = [];
    graphState[key] = {}
    return obj;
  }, {states: {}, runners: {}, results: {}});
  states = obj.states;
  runners = obj.runners;
  results = obj.results;
}

function handleRoundEnd(key, scores){
  var previousCounter = states[key].counter;
  states[key] = manageRound[key].nextGeneration(
    states[key], scores, generationConfig()
  );
  runners[key] = worldRun(
    world_def, states[key].generation, createListeners(key)
  );
  if(states[key].counter === previousCounter){
    console.log(results);
    results[key] = results[key].concat(scores);
  } else {
    handleGenerationEnd(key);
    results[key] = [];
  }
}

function runRound(){
  var toRun = new Map();
  Object.keys(states).forEach(function(key){ toRun.set(key, states[key].counter) });
  console.log(toRun);
  while(toRun.size){
    console.log("running");
    Array.from(toRun.keys()).forEach(function(key){
      if(states[key].counter === toRun.get(key)){
        runners[key].step();
      } else {
        toRun.delete(key);
      }
    });
  }
}

function handleGenerationEnd(key){
  var scores = results[key];
  scores.sort(function (a, b) {
    if (a.score.v > b.score.v) {
      return -1
    } else {
      return 1
    }
  })
  updateUI(key, scores);
  results[key] = [];
}

function cw_resetPopulationUI() {
  $graphList.innerHTML = "";
}

function cw_resetWorld() {
  cw_resetPopulationUI();
  Math.seedrandom();
  generationZero();
}

document.querySelector("#new-population").addEventListener("click", function(){
  cw_resetPopulationUI()
  generationZero();
})


document.querySelector("#confirm-reset").addEventListener("click", function(){
  cw_confirmResetWorld()
})

document.querySelector("#fast-forward").addEventListener("click", function(){
  runRound();
})

function cw_confirmResetWorld() {
  if (confirm('Really reset world?')) {
    cw_resetWorld();
  } else {
    return false;
  }
}

cw_resetWorld();

},{"./draw/plot-graphs.js":7,"./generation-config":11,"./machine-learning/genetic-algorithm/manage-round.js":19,"./machine-learning/simulated-annealing/manage-round.js":24,"./world/run.js":25}],3:[function(require,module,exports){
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

},{}],4:[function(require,module,exports){
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

},{"./car-constants.json":3}],5:[function(require,module,exports){
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

},{"../machine-learning/create-instance":14}],6:[function(require,module,exports){


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

},{}],7:[function(require,module,exports){
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

},{"./scatter-plot":8}],8:[function(require,module,exports){
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

},{}],9:[function(require,module,exports){

module.exports = generateRandom;
function generateRandom(){
  return Math.random();
}

},{}],10:[function(require,module,exports){
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

},{}],11:[function(require,module,exports){
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

},{"../car-schema/construct.js":4,"./generateRandom":9,"./pickParent":12,"./selectFromAllParents":13}],12:[function(require,module,exports){
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

},{}],13:[function(require,module,exports){
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

},{"./inbreeding-coefficient":10}],14:[function(require,module,exports){
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

},{"./random.js":23}],15:[function(require,module,exports){
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
},{}],16:[function(require,module,exports){
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

function clusterMutate(id, clust){
	var neighbors = cluster.findOjectNeighbors(id, cluster, ((clust.length/4)<40)?6:40);
	neighbors.sort(function(a, b){return b.score.s - a.score.s;});
	return neighbors[0].data;
}


},{"./cluster.js/":15}],17:[function(require,module,exports){
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
		if(typeof notEqualsArr === "undefined"){
			runLoop=false;
		}
		else if(notEqualsArr.find(function(value){return value===toReturn;})!==toReturn){
			runLoop=false;
		}
	}
    return toReturn;//(typeof findIfExists === "undefined")?toReturn:getRandomInt(min, max, notEqualsArr);
}

},{}],18:[function(require,module,exports){
module.exports={"name":"objects","array":[{"id":"0.hdf5qn7vrm","wheel_radius":[0.5767690824721248,0.4177286154476836],"wheel_density":[0.05805828499322763,0.5558485029218216],"chassis_density":[0.01746922482830615],"vertex_list":[0.7941546027531794,0.33861058313418346,0.9817966727350886,0.04058391899039471,0.6792764840084577,0.7095516833429869,0.4442929689786037,0.37159709633978144,0.48655491389807315,0.8194897434679949,0.06791292762922252,0.8500617187981201],"wheel_vertex":[0.3197454833804805,0.07306832553443532,0.9696680221321918,0.2824291446288685,0.2380108435356263,0.03420163652850006,0.3930204478494015,0.9292589026168605],"index":0},{"id":"0.ddvqo9c4u5","wheel_radius":[0.07627311653690305,0.38077565824706383],"wheel_density":[0.01863697881086468,0.026864361789310287],"chassis_density":[0.7045568596969818],"vertex_list":[0.8827836738451413,0.4190617493499984,0.017147626844417063,0.2277553534525203,0.9391852300562391,0.41623535047479976,0.667874296655423,0.3184936092984223,0.885601792263214,0.1346539811623968,0.322385303872488,0.161407472396901],"wheel_vertex":[0.17206625167182543,0.2864306277502062,0.9385138859389617,0.7120516346789703,0.47681841776301215,0.9573420057371615,0.34779657603419056,0.4942428001369501],"index":1},{"id":"0.i58eicuogp","wheel_radius":[0.8797742202793692,0.4946090041701663],"wheel_density":[0.6907715700239563,0.35432984993561556],"chassis_density":[0.9971097639358597],"vertex_list":[0.3355939766795686,0.3677035616120996,0.25221017408131474,0.604213571816435,0.1430303697651747,0.6707414538501344,0.7976410790585797,0.0033040193157582998,0.48225864500530036,0.9722463490739863,0.13326685190618814,0.24511863681863266],"wheel_vertex":[0.9134632576763355,0.8028557179231353,0.06520887602002645,0.5008784841753418,0.29660822964929734,0.8268847970499333,0.7035107726768779,0.020149156720311145],"index":2},{"id":"0.gutj76a88f","wheel_radius":[0.9293229179821985,0.14096018806429722],"wheel_density":[0.9610668741784452,0.12918935045544622],"chassis_density":[0.4412938612774773],"vertex_list":[0.509666285390127,0.0440424703718838,0.32355514615481096,0.5028560491467837,0.8855525611846886,0.6634747633908817,0.053720135479725206,0.03939919113473578,0.8659130479988033,0.5292610191155793,0.25844974411733945,0.15674953593305863],"wheel_vertex":[0.10922529798546754,0.8697670750461268,0.8308079459877313,0.6383102766197528,0.7099969858096296,0.5389509745111423,0.8978376331961129,0.6420664501085884],"index":3},{"id":"0.s0qb8gd1uk8","wheel_radius":[0.7219865941050003,0.8749228764898627],"wheel_density":[0.8888827319734467,0.3633780972284817],"chassis_density":[0.7811514341788972],"vertex_list":[0.0710298251902226,0.04777839921760796,0.13258883889938056,0.9766647673306856,0.5400399336725707,0.009490303271581846,0.6105618345293602,0.30769684064628944,0.9536822130361375,0.6608960981573873,0.38788766841235356,0.14698211273515116],"wheel_vertex":[0.45796055398119706,0.5082384005387914,0.6910070637339527,0.49491480576195057,0.017564983056669536,0.9004187121939236,0.950888149443778,0.3145771879983139],"index":4},{"id":"0.am50skfifv8","wheel_radius":[0.4371782151705017,0.16934407528669593],"wheel_density":[0.5155615530382445,0.3746398626558487],"chassis_density":[0.9777831010398579],"vertex_list":[0.4218254332918403,0.13402991979798595,0.5679523833804261,0.9986360454712131,0.1370226529049714,0.6866226723994309,0.21085066722858148,0.11201281036347854,0.6458868083896243,0.7686349179192595,0.5631279410833077,0.8929527870277394],"wheel_vertex":[0.3201300463393102,0.7881304785297669,0.1994622663870953,0.5361312470790522,0.9372844704327077,0.6029566109207931,0.6654959920391821,0.2544075607920917],"index":5},{"id":"0.mjcg9femang","wheel_radius":[0.6075286178996335,0.02893235087829993],"wheel_density":[0.6881171089205549,0.36813690305177627],"chassis_density":[0.9194743667947931],"vertex_list":[0.9045666908132881,0.03170144930478025,0.3338413002137406,0.7848170385408266,0.8832407772242816,0.8265334718769144,0.9629695531244229,0.2736041402092191,0.8088087449763801,0.41076107312794563,0.8217996633679705,0.1483702365231736],"wheel_vertex":[0.11480781743513102,0.1697368994977173,0.22986415922054526,0.9511536546375357,0.780923129239145,0.7910268389663828,0.3456103464776277,0.9613859776527907],"index":6},{"id":"0.idfjve6f8t8","wheel_radius":[0.5411559581495173,0.44125053048089047],"wheel_density":[0.25909875492826284,0.47021399069456327],"chassis_density":[0.3613728202285016],"vertex_list":[0.41021391544269314,0.9881932969769589,0.49847114859554886,0.37319768768805983,0.005002513477929904,0.48993994550737674,0.9672756824011681,0.6109271173927,0.6698014751238872,0.9973690280950067,0.19443632869446215,0.047658470550454135],"wheel_vertex":[0.2864270744805486,0.19040083806112862,0.7719547618207676,0.3130688023992423,0.5529916364259202,0.9133434808376619,0.4711529062266886,0.8871360248210398],"index":7},{"id":"0.9kev7eefp3","wheel_radius":[0.29831527304858163,0.7544895716087605],"wheel_density":[0.1981877988356684,0.7017407123227355],"chassis_density":[0.12698002119723606],"vertex_list":[0.9189283243644228,0.6711416378673025,0.5079419289799354,0.6181036484244244,0.9479695662239411,0.26973353938956346,0.775651358892298,0.8756169233293907,0.05772602678811567,0.2554950773692868,0.7398641638106203,0.7116867640037474],"wheel_vertex":[0.13211088239213153,0.027042464603376004,0.0027046022484826793,0.9188908412047128,0.12734937330346696,0.6312409139785786,0.5458361143483772,0.4202780123037708],"index":8},{"id":"0.94ov1ivvd1g","wheel_radius":[0.4217454865568546,0.1493046286773776],"wheel_density":[0.15780014539785747,0.6349387909103907],"chassis_density":[0.2611015082022081],"vertex_list":[0.1614056198115068,0.7073385308831481,0.8865775204059925,0.3859295957226818,0.006323741490722901,0.5600717160338222,0.7150828584344404,0.46454515534837526,0.08787116907156722,0.7482726424381383,0.6007334079191868,0.3127118710322887],"wheel_vertex":[0.2436228357811132,0.8770990367388483,0.5563324518538395,0.215800578569187,0.7947741936679531,0.7453147294742604,0.7326655050104951,0.8125433747073709],"index":9},{"id":"0.euv3chfcog","wheel_radius":[0.506180192590908,0.4074301248023271],"wheel_density":[0.22819387088526755,0.20388407997970082],"chassis_density":[0.9868098499829738],"vertex_list":[0.8901104916221794,0.0382460536238427,0.01247621775189045,0.3198239375390004,0.24614261702584117,0.661214205610895,0.20887861407179376,0.30724427235234875,0.6906477993219471,0.13420328261045245,0.5562057663925064,0.5636912336060713],"wheel_vertex":[0.27292940315827985,0.8116694811049994,0.34305427081267625,0.737790370926398,0.7144049632051976,0.4136553492822954,0.9065788650669486,0.2673436684220467],"index":10},{"id":"0.3t73r089878","wheel_radius":[0.33434778236081897,0.3311075004472892],"wheel_density":[0.14826510887752065,0.748740057701869],"chassis_density":[0.09686964778059548],"vertex_list":[0.173451890973358,0.954957853504486,0.12969012388639367,0.8093440049579759,0.20662170223633236,0.5957475494308369,0.12093093644627673,0.23827678515406414,0.8782369771550591,0.18793972440902174,0.5340249844612774,0.6746936255896423],"wheel_vertex":[0.7737452828565528,0.2179732704223123,0.6433926126933227,0.05597399128863212,0.8364909201028081,0.5594266368540888,0.48026892671736365,0.13286338544745901],"index":11},{"id":"0.otp4mhgfflg","wheel_radius":[0.3096723890899076,0.3270905845862535],"wheel_density":[0.9519797779470658,0.4824659127948694],"chassis_density":[0.508849513971634],"vertex_list":[0.05385076804821032,0.4724615769754572,0.4759187607571993,0.8404392103904694,0.6068039184056986,0.24506037957624516,0.7890583591097218,0.4280727348285014,0.914308399814743,0.016679245786350494,0.023597365922794156,0.5472150478296525],"wheel_vertex":[0.9681325471086923,0.8440592804832436,0.5633043887572953,0.38659997190573114,0.9457256976802073,0.15689595746838436,0.5459903281063443,0.6834766601643341],"index":12},{"id":"0.m72cm8glci","wheel_radius":[0.4921190205702557,0.9730123122187448],"wheel_density":[0.6138731107622271,0.80188826074077],"chassis_density":[0.27336366221265496],"vertex_list":[0.48673379371347725,0.5616639421186809,0.6652628675453733,0.521127869483095,0.8826236680283714,0.7724370159671963,0.5328543643014874,0.48289945395031975,0.7011128939985845,0.9407919374959133,0.5196758016268144,0.26214607732622563],"wheel_vertex":[0.026968037135228773,0.8078115090468778,0.11567871694998044,0.2887653152210481,0.10871636169735654,0.29005831038415697,0.9705208285856395,0.8521699632762305],"index":13},{"id":"0.9hjuq0vark8","wheel_radius":[0.7377742272424606,0.27766419711539014],"wheel_density":[0.12067982288380974,0.5508429477497803],"chassis_density":[0.4742777307191277],"vertex_list":[0.475325738509615,0.653462696268186,0.23624452185059952,0.8624773295336279,0.3843663053567725,0.29624163876361664,0.8555864028060363,0.6153797712621405,0.022909313308777657,0.7078073819405373,0.2995603233023847,0.9591599855399191],"wheel_vertex":[0.915914626913259,0.6956844692079878,0.33284691963176405,0.7919985193630892,0.8846996483826077,0.7862606433515567,0.6523325763895098,0.8016109420768407],"index":14},{"id":"0.pk4uqro41u","wheel_radius":[0.8658881007803165,0.3357331986398473],"wheel_density":[0.5692064557307324,0.2791454871011563],"chassis_density":[0.3120375400367086],"vertex_list":[0.9189554009992524,0.3542579100478469,0.14964826963447164,0.9548992038109447,0.5136981847958031,0.5425422233324078,0.5382322667339448,0.6867404819061971,0.2403071409704176,0.5960192026151729,0.1981391854660728,0.0652119555215982],"wheel_vertex":[0.9382147287284206,0.6389032897639346,0.5745068606896859,0.3298007956203739,0.3748010225243654,0.1555312745759434,0.3488865368809815,0.2288608901580047],"index":15},{"id":"0.92pmqftm078","wheel_radius":[0.20940186357804302,0.9601831855684502],"wheel_density":[0.6074865062552535,0.487214084857744],"chassis_density":[0.8879779581417373],"vertex_list":[0.37229358911709576,0.3250638149302463,0.02399624334167294,0.5076844925929369,0.9361788706360077,0.5599877675198013,0.6178761701945197,0.19199515412459323,0.436893994490962,0.3409731423377498,0.4982559500560275,0.3018054779863344],"wheel_vertex":[0.4805567992416928,0.529172971508425,0.4576824490185867,0.28815816259966853,0.41307038021277576,0.8496303102150315,0.44262409410280923,0.118990835397361],"index":16},{"id":"0.p0bb3jcsa6o","wheel_radius":[0.8053770409363876,0.004608511505876489],"wheel_density":[0.37032936585319853,0.9110718290739903],"chassis_density":[0.41268931366555517],"vertex_list":[0.37505529616887445,0.3269894555788473,0.7824287339617897,0.08916755260272602,0.11846368789958772,0.6182305402069848,0.6883467480158929,0.38177905214995667,0.7208181609591433,0.7182811672980731,0.5053403982433966,0.6785485903889392],"wheel_vertex":[0.8602516434667127,0.9182412895648713,0.4943321446494058,0.4066814424053633,0.9450033934436965,0.04147678416903,0.9074303141025282,0.7920805318139295],"index":17},{"id":"0.g6nue40o6u","wheel_radius":[0.25950365179089285,0.45117196696361517],"wheel_density":[0.8737773207491646,0.3825049459175984],"chassis_density":[0.5750636056432643],"vertex_list":[0.16155077272274365,0.17401914773170235,0.4287580781076481,0.42932923860305827,0.47608143506731326,0.016141666182198033,0.7490069599283697,0.8779156633754976,0.6080928470185578,0.4845763154960605,0.15989694525876041,0.5492330632971734],"wheel_vertex":[0.4886604267859962,0.9507100553360299,0.8963786004106906,0.13962004268890382,0.017105305761339284,0.1203208130328568,0.9016859645440254,0.31282796595626206],"index":18},{"id":"0.uikpm9rmbb","wheel_radius":[0.0806451504762078,0.08423101469841532],"wheel_density":[0.34463928350406126,0.8694895031478671],"chassis_density":[0.14008481796461525],"vertex_list":[0.6860355827823672,0.9475637834183746,0.5480446481881946,0.2729072912678334,0.9158071629011582,0.5403677312919277,0.7110438375848036,0.34666135351410454,0.7835892647613154,0.2691403271699404,0.14436046411629033,0.27168516794708797],"wheel_vertex":[0.8176594755946187,0.6637355241449168,0.8402473944959381,0.6435582131301778,0.917040841042623,0.9824387525583211,0.49791639446670644,0.005377830182361487],"index":19},{"id":"0.phkod4h666o","wheel_radius":[0.3885121547052115,0.9408147796867175],"wheel_density":[0.6066760499920387,0.7437853735141478],"chassis_density":[0.047619348463744826],"vertex_list":[0.2818018188994671,0.5376711283235511,0.278265249347057,0.37180380749404063,0.0016354112440770674,0.3734920298406539,0.9258243649433546,0.9611282010648099,0.2635677758443302,0.2995122669698769,0.45009537621663176,0.14120495018961954],"wheel_vertex":[0.8211527025300243,0.6378520646150085,0.8433691242450887,0.10080112530514906,0.7420571718643294,0.06240659449537578,0.5019963798229192,0.13958803327033276],"index":20},{"id":"0.cdsb2t0a0gg","wheel_radius":[0.24505842176601966,0.47937570661588036],"wheel_density":[0.7318963359198882,0.20433591906714255],"chassis_density":[0.9440804013808017],"vertex_list":[0.2767177185735572,0.40191206919739253,0.6992520631753649,0.5805367054765673,0.5328760694595893,0.6051655266396856,0.8659374923698233,0.6385740518164591,0.09136175672495295,0.1946267162607933,0.5848324783419472,0.9612115069889817],"wheel_vertex":[0.9840419708674404,0.4002078328877534,0.6114668493004969,0.0547662826963875,0.7590263236186896,0.9095821718443651,0.8252785001445193,0.9354573503144779],"index":21},{"id":"0.5ec3f7uc86g","wheel_radius":[0.7428794526737739,0.14727079055353554],"wheel_density":[0.21720134324657558,0.5754268794146837],"chassis_density":[0.22476421424897008],"vertex_list":[0.8212963728160105,0.2297331892207486,0.21058817977645528,0.3002863349191449,0.16095424113953083,0.28570979035001876,0.8505053225959205,0.012099775565245663,0.43071909702961464,0.3581820673390337,0.9941396663350952,0.17115204663164763],"wheel_vertex":[0.6349365043647393,0.8564168056559227,0.8347314103983197,0.013561600989115519,0.20473813555899079,0.973788949531528,0.3298955475720191,0.704049870268243],"index":22},{"id":"0.o2m7e3jl5m","wheel_radius":[0.8661369447423091,0.36209186636855173],"wheel_density":[0.24886369948296272,0.9481136708961697],"chassis_density":[0.4645349071428597],"vertex_list":[0.3963158171740233,0.3256278822452916,0.4358865621693082,0.4180065756720124,0.03350757790126613,0.2681067495962719,0.19145799526267337,0.7371111884911565,0.4500408955195885,0.10688261567679347,0.3821541311464922,0.009416750541172192],"wheel_vertex":[0.9575462712867551,0.5695500762355803,0.7981443002154605,0.9474328403749823,0.7027016096400711,0.8286424663713696,0.8310500009461772,0.20389451798323543],"index":23},{"id":"0.vij7h4ll3ig","wheel_radius":[0.1814980076155488,0.26389762050722565],"wheel_density":[0.2829352972703518,0.7426468978176506],"chassis_density":[0.014486662613823365],"vertex_list":[0.05308677758606217,0.3660329920000105,0.9154588111109756,0.6599367403142471,0.006236701000372102,0.9416779757734717,0.8080809278339618,0.4249971585729182,0.43942023623270776,0.4463217820443348,0.740757020638958,0.09154286362854247],"wheel_vertex":[0.1701478887113994,0.23951500026651695,0.8417160753050081,0.44668632197313785,0.7984746620110903,0.24993050509729642,0.5982613413718036,0.024634143380375617],"index":24},{"id":"0.vbudpq7r8jg","wheel_radius":[0.1880833792086538,0.2909417556253724],"wheel_density":[0.3835353607487637,0.12542471127806198],"chassis_density":[0.9914887266787835],"vertex_list":[0.1408202327951953,0.9006563749172454,0.2860131896546747,0.5036058268015096,0.28237175351464594,0.6920935097717549,0.4030021430205859,0.4526349625334938,0.32951066138675067,0.9915639303248924,0.15421491780180507,0.5658120376445028],"wheel_vertex":[0.6207796081251498,0.08457529321879997,0.30959608934504557,0.9289887901506075,0.21134420090001038,0.26615847404781046,0.9679986325992576,0.036393266609056285],"index":25},{"id":"0.4igks77dflg","wheel_radius":[0.6162630688805109,0.996322195724116],"wheel_density":[0.07219389558395028,0.8163090041579422],"chassis_density":[0.6463871724924768],"vertex_list":[0.14686282939592732,0.3538624338089038,0.7352789107172508,0.8336219131334901,0.1345844214947911,0.0695711666235328,0.05891574961142054,0.5915082113269567,0.8106099081756695,0.09587631742587899,0.9775789162130557,0.620011000251137],"wheel_vertex":[0.23869164317299063,0.46960820534342784,0.9809209433980268,0.09408717517598952,0.9596228458615494,0.1493106650385012,0.5424116949883415,0.35068762039149237],"index":26},{"id":"0.i7in710f398","wheel_radius":[0.01074243535706998,0.37496150244395476],"wheel_density":[0.21761163033987585,0.28770690417266986],"chassis_density":[0.7788504774708707],"vertex_list":[0.9065045294527061,0.08320308349875738,0.03460864728278068,0.12885459498203744,0.7036120113589297,0.8301158151858712,0.3957769158442701,0.9897614345181391,0.0808815370561955,0.9435460667351685,0.3070266134901427,0.055233471026243874],"wheel_vertex":[0.22706240786290133,0.45363882858134663,0.4043110543388071,0.0466213326785736,0.17376130548777313,0.6419416055422196,0.45034182053638894,0.06303486495462352],"index":27},{"id":"0.96ivqppegag","wheel_radius":[0.4911179230902005,0.35046444691939094],"wheel_density":[0.33534449672897026,0.9335176580032427],"chassis_density":[0.31957538664110574],"vertex_list":[0.5926254873859351,0.7192087995229846,0.48449163046938826,0.7820757616208582,0.7462054398245774,0.09042624653203046,0.10702581503547992,0.9061878773626963,0.6522294122845294,0.6772711351923497,0.024511693552243807,0.8054593143058355],"wheel_vertex":[0.36029810438333065,0.6065237606237144,0.32602132171242637,0.5940415719076406,0.5821058694804442,0.6474690800650107,0.5906562254817702,0.47754843993265594],"index":28},{"id":"0.ffq8depchpg","wheel_radius":[0.19424114403784554,0.4111615025466757],"wheel_density":[0.7161119526969035,0.9210914218979367],"chassis_density":[0.6726066425877597],"vertex_list":[0.6087251491790631,0.7126922563608298,0.2848133218245028,0.2577778930560264,0.932291750560869,0.26024634386180456,0.9008608369751749,0.8196861793402688,0.049781128250446116,0.49846896499176063,0.42206776267989876,0.132826473899182],"wheel_vertex":[0.5527071271647432,0.6006663093919147,0.8888707647843714,0.24472713041630212,0.9264449367786494,0.008673983220342851,0.6561268639305937,0.800869840601915],"index":29},{"id":"0.31k1bsa29v8","wheel_radius":[0.5216579723226884,0.6938038782520572],"wheel_density":[0.7510504930846378,0.9360211671641339],"chassis_density":[0.9919692547833585],"vertex_list":[0.6202253450662798,0.8408932902288029,0.1467079955608943,0.9850450301241724,0.2334449761912203,0.28979123273254603,0.27093808017567866,0.19070462374783892,0.05336059782942826,0.827607292663183,0.931912342192549,0.43767176285957676],"wheel_vertex":[0.041586694728670714,0.0729827175190807,0.016916154905290748,0.4901454598823205,0.23119893679665826,0.02513006823214936,0.48938909863925995,0.3884350170537745],"index":30},{"id":"0.90kkvb4ucho","wheel_radius":[0.9101037992785472,0.4878592470115912],"wheel_density":[0.3848477970824631,0.45389049697961203],"chassis_density":[0.26080079893693164],"vertex_list":[0.5317932075935214,0.6878189310214191,0.9803101493711177,0.765751655053434,0.4060187183216988,0.11848729489072851,0.5735242259078523,0.9888373140171343,0.6631421747820911,0.5430329863620216,0.45982999435836613,0.8969676517036023],"wheel_vertex":[0.4054572620878496,0.381705658335161,0.6234951462381657,0.6433288559734538,0.857228266497932,0.8995549741199367,0.07651132793231885,0.7711765286985368],"index":31},{"id":"0.ajgtci3scg8","wheel_radius":[0.3351948140617189,0.6299731879087538],"wheel_density":[0.41534186810288554,0.2704413527223042],"chassis_density":[0.7013723526271509],"vertex_list":[0.7415782592669138,0.6352644432918293,0.17366602596210967,0.5072067934274973,0.5915560432013875,0.45493011325168453,0.2649409230524493,0.7562110356524923,0.07853292166813741,0.6154358760762721,0.8188030989851804,0.8748310389153457],"wheel_vertex":[0.10862349731806309,0.5857623668477845,0.47340786079757935,0.26666160156141405,0.7117025932806522,0.5334392851294998,0.9740204710346876,0.8119489411484921],"index":32},{"id":"0.ij6nllcc6j8","wheel_radius":[0.06576536071883776,0.2698134606168656],"wheel_density":[0.10826988964142781,0.4280793840639776],"chassis_density":[0.12451753555889056],"vertex_list":[0.9859276756591981,0.3236156178318257,0.23881710989060712,0.9085044838312986,0.07590918519143286,0.11783026761501492,0.7545494743180108,0.9830926222611833,0.2055190743128783,0.7084273553891405,0.6180798124777225,0.03837658378808495],"wheel_vertex":[0.26257958329367814,0.37422756343544883,0.9706637097723838,0.8270402872916975,0.6423470602861527,0.3049469603936841,0.020315424421025075,0.6731542315692196],"index":33},{"id":"0.cfamjkge14","wheel_radius":[0.5553371223441326,0.48255952545301195],"wheel_density":[0.10233567955957112,0.4118663994606462],"chassis_density":[0.8507010372498203],"vertex_list":[0.4435526144410815,0.7952571161216015,0.6956674298481698,0.7700381150426268,0.02443779192265727,0.3314924202264524,0.5348472872176893,0.16998983587117444,0.3702567531636358,0.13248871108359395,0.32421152908080253,0.12384389935429585],"wheel_vertex":[0.5562361777413118,0.02018197327300042,0.6656773966986882,0.34056707549167897,0.3228687248283031,0.005468963280792272,0.24874132312313169,0.007568029417329258],"index":34},{"id":"0.897upusp00o","wheel_radius":[0.9506221057739288,0.263467828878726],"wheel_density":[0.7810166453464373,0.38647992998898206],"chassis_density":[0.0735421825781255],"vertex_list":[0.33373114115871116,0.09869861121728296,0.1555855146519025,0.3174873187217855,0.4752826770773326,0.3299159892797654,0.19600097967524555,0.14925170964195633,0.006864524052712984,0.7532489017554023,0.438354172052676,0.31124012477685215],"wheel_vertex":[0.8498673328952575,0.48833250139633355,0.714801647554276,0.8987104136285196,0.9384108494792647,0.8839853876491639,0.4194011057562126,0.5022476949036452],"index":35},{"id":"0.eugue9pc7qo","wheel_radius":[0.14580879382814493,0.874400937581342],"wheel_density":[0.35057826376474344,0.49085712757371947],"chassis_density":[0.9261449817850527],"vertex_list":[0.1669027978157156,0.2688530561348279,0.4102379290204792,0.5814259556405568,0.44957812309096634,0.7507083572416744,0.07287773329701586,0.7974367736625725,0.06846180783077527,0.7344754291191549,0.5703026759329677,0.628933557495567],"wheel_vertex":[0.7917192328086229,0.5708019023659623,0.7765250209157932,0.29264234660147226,0.27938923378975344,0.14348106135106042,0.5609167555087855,0.5047442938192339],"index":36},{"id":"0.l6scl5ntjd","wheel_radius":[0.24557812148752567,0.6740496043706881],"wheel_density":[0.07800478790603682,0.5224295673385457],"chassis_density":[0.04608851170320549],"vertex_list":[0.3075353258067306,0.946497419967802,0.40629223029438566,0.2763741078982387,0.2564047413245427,0.9311538993240389,0.6453254163405322,0.6114796828964544,0.5378282883910244,0.19921609846644528,0.9653785345250194,0.39789096849914607],"wheel_vertex":[0.17526063711196405,0.5219227364785715,0.19228400828285652,0.4747119812082834,0.12939951976376407,0.9719157459336423,0.05855057550033971,0.17011606800359047],"index":37},{"id":"0.skr6mmi0sug","wheel_radius":[0.13019903595315174,0.6978847412153089],"wheel_density":[0.9380383929168379,0.9006263152797596],"chassis_density":[0.5362153572215496],"vertex_list":[0.7898533203452032,0.04826996095952185,0.10461690807436286,0.19143508600849146,0.8187561846892544,0.2535765016568483,0.4644271093103154,0.7747321663565605,0.7155888564099566,0.22773684985020748,0.8764042408069712,0.25650019822349357],"wheel_vertex":[0.9742245496507285,0.38649515346286556,0.330704831027097,0.8695117307217375,0.8324213556099074,0.1815734170046004,0.40685293714777715,0.36774085813193635],"index":38},{"id":"0.0bod8ulve58","wheel_radius":[0.5690838202354156,0.24947317707233663],"wheel_density":[0.5327172442416095,0.5221831496178757],"chassis_density":[0.858638303927433],"vertex_list":[0.6544165849856707,0.7921670656120694,0.22828101591886552,0.6608910536558867,0.025260356428931097,0.7044614209271924,0.9761907228962194,0.4711649209146893,0.5727050275473584,0.8272756635204241,0.3982557215345284,0.546708833415614],"wheel_vertex":[0.20255946416681603,0.2824579920782291,0.30185189504063725,0.7373091921243422,0.8353113639169545,0.8787308062707437,0.20223004484930285,0.7812766443788959],"index":39}]}
},{}],19:[function(require,module,exports){
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
@param selectionTypeOne int - the selection method for the first parent
@param selectionTypeTwo int - the selection method for the second parent
@param mateIncreaseSelectionMethod int - the selection method for choosing the mateIncrease parent which will not be deleted
@return parentsScore int - returns the average score of the parents*/
function selectParents(parents, scores, increaseMate, selectionTypeOne, selectionTypeTwo, mateIncreaseSelectionMethod){
	var parent1 = selection.runSelection(scores,(increaseMate===false)?selectionTypeOne:mateIncreaseSelectionMethod);
	parents.push(parent1.def);
	if(increaseMate===false){
		scores.splice(scores.findIndex(x=> x.def.id===parents[0].id),1);
	}
	var parent2 = selection.runSelection(scores,(increaseMate===false)?selectionTypeTwo:mateIncreaseSelectionMethod);
	parents.push(parent2.def);
	scores.splice(scores.findIndex(x=> x.def.id===parents[1].id),1);
	return (parent1.score.s + parent2.score.s)/2;
}

/*This function runs a Evolutionary algorithm which uses Selection, Crossover and mutations to create the new populations of cars.
@param scores ObjectArray - An array which holds the car objects and there performance scores
@param config - This is the generationConfig file passed through which gives the cars template/blueprint for creation
@param noCarsCreated int - The number of cars there currently exist used for creating the id of new cars
@param selectionTypeOne int - the selection method for the first parent
@param selectionTypeTwo int - the selection method for the second parent
@param mutationType int - the type of mutation to be used either single mutation or multi-mutations
@param mateIncreaseSelectionMethod int - the selection method for choosing the mateIncrease parent which will not be deleted
@return newGeneration ObjectArray - is returned with all the newly created cars that will be in the simulation*/
function runEA(scores, config, noCarsCreated, noElites, crossoverType, noMateIncrease, selectionTypeOne, selectionTypeTwo, mutationType, mateIncreaseSelectionMethod, clust){
	scores.sort(function(a, b){return b.score.s - a.score.s;});
	var generationSize=scores.length;
	var newGeneration = new Array();
	var maxNoMatesIncreases = noMateIncrease;
	var currentNoMateIncreases = 0;
	var noElites=noElites;
	var tempClust;
	if(typeof clust !== "undefined"){
		if(clust.arrayOfClusters[0].dataArray.length>2){tempClust=clust;}
	}
	for(var i=0;i<noElites;i++){//add new elites to newGeneration
		var newElite = scores[i].def;
		newElite.elite = true;
		newGeneration.push(newElite);
	}
	for(var k = 0;k<generationSize/2;k++){
		if(newGeneration.length!==generationSize){
		var pickedParents = [];
		var parentsScore = selectParents(pickedParents, scores, (currentNoMateIncreases<maxNoMatesIncreases)?true:false, selectionTypeOne, selectionTypeTwo, mateIncreaseSelectionMethod); 
		if(currentNoMateIncreases<maxNoMatesIncreases){currentNoMateIncreases++;}
			var newCars = crossover.runCrossover(pickedParents, crossoverType,config.schema, parentsScore, noCarsCreated, (newGeneration.length===generationSize-1)?1:2);
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
				newGeneration[x] = ((mutationType===0)||(mutationType===3))?mutation.mutate(newGeneration[x], tempClust):mutation.multiMutations(newGeneration[x],newGeneration.findIndex(x=> x.id===currentID),20);
			}
		}
		console.log(newGeneration);
	return newGeneration;
}

/*This function runs the Baseline Evolutionary algorithm which only runs a mutation or multiMutations over all the cars passed though in the scores parameter.
@param scores Array - This parameter is an array of cars that holds the score statistics and car data such as id and "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"
@param config - This passes a file with functions that can be called.
@return newGeneration - this is the new population that have had mutations applied to them.*/
function runBaselineEA(scores, config, clust){
	scores.sort(function(a, b){return a.score.s - b.score.s;});
	var schema = config.schema;//list of car variables i.e "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex" and "wheel_density"
	var newGeneration = new Array();
	var generationSize=scores.length;
	console.log(scores);//test data
	for (var k = 0; k < generationSize; k++) {
		var tempClust;
		if(clust.arrayOfClusters[0].dataArray.length>2){tempClust=clust;}
		newGeneration.push(mutation.mutate(scores[k].def, tempClust));
		//newGeneration.push(mutation.mutate(scores[k].def));
		//newGeneration.push(mutation.multiMutations(scores[k].def,scores.findIndex(x=> x.def.id===scores[k].def.id),20));
		newGeneration[k].elite = false;
		newGeneration[k].index = k;
	}
	
	return newGeneration;
}	

/*
This function handles the choosing of which Evolutionary algorithm to run and returns the new population to the simulation*/
function nextGeneration(previousState, scores, config){
	//--------------------------------------------------------- SET EVOLUTIONARY ALGORITHM OPERATORS HERE <---------------
	var noElites = 0;//type the number of elites for the program to use
	var crossoverType=1;//write 1 for one-point crossover anyother for two-point crossover
	var noMateIncrease=3;//The number of cars that can mate twice producing 4 kids not 2
	var mateIncreaseSelectionMethod = 1;// 1 for tournament selection using sub-arrays/ 2 for tournament selection to get weakest car/3 for roulette-selection/ 4 for uniform random selection
	// selectionType for selection the two parents selectionTypeOne for the first slection, selectionTypeTwo for the second parent
	var selectionTypeOne = 3;// 1 for tournament selection using sub-arrays/ 2 for tournament selection to get weakest car/3 for roulette-selection/ 4 for uniform random selection
	var selectionTypeTwo = 3;// 1 for tournament selection using sub-arrays/ 2 for tournament selection to get weakest car/3 for roulette-selection/ 4 for uniform random selection
	var mutationType =0;//0 for standard 1 mutation type 1 for multi-mutations, 3 for cluster mutation
	var useClusteringScoring = false;
	//--------------------------------------------------------------------------------------------------------------------
	var generationSize=scores.length;
	var newGeneration = new Array();
	var count;
	var tempRound=0;
	
	tempRound=(typeof previousState.round ==="undefined")?0:previousState.round;
	count = previousState.counter + 1;
	var clusterInt;
	if((mutationType===3)||(useClusteringScoring===true)){
		if(previousState.counter===0){
			clusterInt=cluster.setup(scores,null,false)
		}
		else{
			clusterInt=cluster.setup(scores,previousState.clust,true)
		}
		if(useClusteringScoring===true){
		cluster.reScoreCars(scores ,clusterInt);
		}
	}
	scores.sort(function(a, b){return a.score.s - b.score.s;});
	var numberOfCars = (previousState.counter===0)?generationSize:previousState.noCars+generationSize;
	var schema = config.schema;//list of car variables i.e "wheel_radius", "chassis_density", "vertex_list", "wheel_vertex"
	
	console.log("Log -- "+previousState.counter);
	//console.log(scoresData);//test data
	var eaType = 1;
	newGeneration = (eaType===1)?runEA(scores, config, numberOfCars, noElites, crossoverType, noMateIncrease, selectionTypeOne, selectionTypeTwo, mutationType, mateIncreaseSelectionMethod, clusterInt):runBaselineEA(scores, config,clusterInt);
	//console.log(newGeneration);//test data
	if(previousState.counter>150){
		count=0;
		tempRound++;
		//newGeneration=generationZero(config).generation;
		
	}
  return {
    counter: count,
    generation: newGeneration,
	clust: clusterInt,
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

},{"../create-instance":14,"./clustering/clusterSetup.js/":16,"./crossover.js/":17,"./initialCars.json/":18,"./mutation.js/":20,"./randomInt.js/":21,"./selection.js/":22,"fs":1}],20:[function(require,module,exports){
var cluster = require("./clustering/clusterSetup.js/");

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
		if(typeof notEqualsArr === "undefined"){
			runLoop=false;
		}
		else if(notEqualsArr.find(function(value){return value===toReturn;})!==toReturn){
			runLoop=false;
		}
	}
    return toReturn;//(typeof findIfExists === "undefined")?toReturn:getRandomInt(min, max, notEqualsArr);
}


function changeArrayValue(id, originalValue, clust, dataType){
	for(var i=0;i<originalValue.length;i++){
		if(typeof clust === "undefined"){
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
		} else {
			var newClust;
			for(var y=0;y<clust.arrayOfClusters.length;y++){
				if(clust.arrayOfClusters[y].id===dataType){
					newClust=clust.arrayOfClusters[y];
				}
			}
			var newValue = (cluster.clusterMutate(id,newClust.dataArray[i].dataArray)-originalValue[i])*0.3;
			originalValue[i]=orginalValue[i]+newValue;
		}
	}
	return originalValue;
}

function mutate(car, clust){
	return changeData(car,new Array(),1, clust);
}

function changeData(car, multiMutations, noMutations, clust){
	var randomInt = getRandomInt(0,4, multiMutations);
	if(randomInt===1){
		car.chassis_density=changeArrayValue(car.id, car.chassis_density, clust, "chassis_density");
	}
	else if(randomInt===2){
		car.vertex_list=changeArrayValue(car.id, car.vertex_list, clust, "vertex_list");
	}
	else if(randomInt===3){
		car.wheel_density=changeArrayValue(car.id, car.wheel_density, clust, "wheel_density");
	}
	else if(randomInt===4){
		car.wheel_radius=changeArrayValue(car.id, car.wheel_radius, clust, "wheel_radius");
	}
	else {
		car.wheel_vertex=changeArrayValue(car.id, car.wheel_vertex, clust, "wheel_vertex");
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
},{"./clustering/clusterSetup.js/":16}],21:[function(require,module,exports){
 module.exports = {
	getRandomInt: getRandomInt
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
		if(typeof notEqualsArr === "undefined"){
			runLoop=false;
		}
		else if(notEqualsArr.find(function(value){return value===toReturn;})!==toReturn){
			runLoop=false;
		}
	}
    return toReturn;//(typeof findIfExists === "undefined")?toReturn:getRandomInt(min, max, notEqualsArr);
}
},{}],22:[function(require,module,exports){
//var randomInt = require("./randomInt.js/");
//var getRandomInt = randomInt.getRandomInt;

module.exports = {
	runSelection: runSelection
}
/*
This function changes the type of selection used depending on the parameter number "selectType" = (rouleteWheelSel - 1, tournamentSelection - 2)
@param selectType int - this parameter determines the type of selection used - 1 for tournament selection using sub-arrays/ 2 for tournament selection to get weakest car/3 for roulette-selection/ 4 for uniform random selection.
@param carsArr Array - this parameter is the population which the selection functions are used on.
@return ObjectArray - the parents array of two is returned from either tournament or roullete wheel selection*/
function runSelection(carsArr, selectType){
	// SelectType - 1 for tournament selection using sub-arrays/ 2 for tournament selection to get weakest car/3 for roulette-selection/ 4 for uniform random selection
	var strongest = (selectType===1)?true:false;
	var useSubSet = ((selectType===1)||(selectType===2))?true:false;
	var uniform = (selectType===4)?true:false;
	if((selectType===3)||(selectType===4)){
		return rouleteWheelSel(carsArr, uniform);
	} 
	else if((selectType===1)||selectType===2){
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
	if(useSubSet===true){
		subSet.sort(function(a,b){return (strongest===true)?b.score.s - a.score.s:a.score.s - b.score.s;});
	} else {
		carsArr.sort(function(a,b){return (strongest===true)?b.score.s - a.score.s:a.score.s - b.score.s;});
	}
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
		if(typeof notEqualsArr === "undefined"){
			runLoop=false;
		}
		else if(notEqualsArr.find(function(value){return value===toReturn;})!==toReturn){
			runLoop=false;
		}
	}
    return toReturn;//(typeof findIfExists === "undefined")?toReturn:getRandomInt(min, max, notEqualsArr);
}


},{}],23:[function(require,module,exports){


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

},{}],24:[function(require,module,exports){
var create = require("../create-instance");

module.exports = {
  generationZero: generationZero,
  nextGeneration: nextGeneration,
}

function generationZero(config){
  var oldStructure = create.createGenerationZero(
    config.schema, config.generateRandom
  );
  var newStructure = createStructure(config, 1, oldStructure);

  var k = 0;

  return {
    counter: 0,
    k: k,
    generation: [newStructure, oldStructure]
  }
}

function nextGeneration(previousState, scores, config){
  var nextState = {
    k: (previousState.k + 1)%config.generationSize,
    counter: previousState.counter + (previousState.k === config.generationSize ? 1 : 0)
  };
  // gradually get closer to zero temperature (but never hit it)
  var oldDef = previousState.curDef || previousState.generation[1];
  var oldScore = previousState.score || scores[1].score.v;

  var newDef = previousState.generation[0];
  var newScore = scores[0].score.v;


  var temp = Math.pow(Math.E, -nextState.counter / config.generationSize);

  var scoreDiff = newScore - oldScore;
  // If the next point is higher, change location
  if(scoreDiff > 0){
    nextState.curDef = newDef;
    nextState.score = newScore;
    // Else we want to increase likelyhood of changing location as we get
  } else if(Math.random() > Math.exp(-scoreDiff/(nextState.k * temp))){
    nextState.curDef = newDef;
    nextState.score = newScore;
  } else {
    nextState.curDef = oldDef;
    nextState.score = oldScore;
  }

  console.log(previousState, nextState);

  nextState.generation = [createStructure(config, temp, nextState.curDef)];

  return nextState;
}


function createStructure(config, mutation_range, parent){
  var schema = config.schema,
    gen_mutation = 1,
    generateRandom = config.generateRandom;
  return create.createMutatedClone(
    schema,
    generateRandom,
    parent,
    mutation_range,
    gen_mutation
  )

}

},{"../create-instance":14}],25:[function(require,module,exports){
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

},{"../car-schema/def-to-car":5,"../car-schema/run":6,"./setup-scene":26}],26:[function(require,module,exports){
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

},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9saWIvX2VtcHR5LmpzIiwic3JjL2JhcmUuanMiLCJzcmMvY2FyLXNjaGVtYS9jYXItY29uc3RhbnRzLmpzb24iLCJzcmMvY2FyLXNjaGVtYS9jb25zdHJ1Y3QuanMiLCJzcmMvY2FyLXNjaGVtYS9kZWYtdG8tY2FyLmpzIiwic3JjL2Nhci1zY2hlbWEvcnVuLmpzIiwic3JjL2RyYXcvcGxvdC1ncmFwaHMuanMiLCJzcmMvZHJhdy9zY2F0dGVyLXBsb3QuanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvZ2VuZXJhdGVSYW5kb20uanMiLCJzcmMvZ2VuZXJhdGlvbi1jb25maWcvaW5icmVlZGluZy1jb2VmZmljaWVudC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9pbmRleC5qcyIsInNyYy9nZW5lcmF0aW9uLWNvbmZpZy9waWNrUGFyZW50LmpzIiwic3JjL2dlbmVyYXRpb24tY29uZmlnL3NlbGVjdEZyb21BbGxQYXJlbnRzLmpzIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvY3JlYXRlLWluc3RhbmNlLmpzIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvZ2VuZXRpYy1hbGdvcml0aG0vY2x1c3RlcmluZy9jbHVzdGVyLmpzIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvZ2VuZXRpYy1hbGdvcml0aG0vY2x1c3RlcmluZy9jbHVzdGVyU2V0dXAuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9jcm9zc292ZXIuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9pbml0aWFsQ2Fycy5qc29uIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvZ2VuZXRpYy1hbGdvcml0aG0vbWFuYWdlLXJvdW5kLmpzIiwic3JjL21hY2hpbmUtbGVhcm5pbmcvZ2VuZXRpYy1hbGdvcml0aG0vbXV0YXRpb24uanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9yYW5kb21JbnQuanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9nZW5ldGljLWFsZ29yaXRobS9zZWxlY3Rpb24uanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9yYW5kb20uanMiLCJzcmMvbWFjaGluZS1sZWFybmluZy9zaW11bGF0ZWQtYW5uZWFsaW5nL21hbmFnZS1yb3VuZC5qcyIsInNyYy93b3JsZC9ydW4uanMiLCJzcmMvd29ybGQvc2V0dXAtc2NlbmUuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9LQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNySEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3REQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEdBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL05BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOURBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiByKGUsbix0KXtmdW5jdGlvbiBvKGksZil7aWYoIW5baV0pe2lmKCFlW2ldKXt2YXIgYz1cImZ1bmN0aW9uXCI9PXR5cGVvZiByZXF1aXJlJiZyZXF1aXJlO2lmKCFmJiZjKXJldHVybiBjKGksITApO2lmKHUpcmV0dXJuIHUoaSwhMCk7dmFyIGE9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitpK1wiJ1wiKTt0aHJvdyBhLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsYX12YXIgcD1uW2ldPXtleHBvcnRzOnt9fTtlW2ldWzBdLmNhbGwocC5leHBvcnRzLGZ1bmN0aW9uKHIpe3ZhciBuPWVbaV1bMV1bcl07cmV0dXJuIG8obnx8cil9LHAscC5leHBvcnRzLHIsZSxuLHQpfXJldHVybiBuW2ldLmV4cG9ydHN9Zm9yKHZhciB1PVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmUsaT0wO2k8dC5sZW5ndGg7aSsrKW8odFtpXSk7cmV0dXJuIG99cmV0dXJuIHJ9KSgpIiwiIiwiLyogZ2xvYmFscyBkb2N1bWVudCBjb25maXJtIGJ0b2EgKi9cclxuLyogZ2xvYmFscyBiMlZlYzIgKi9cclxuLy8gR2xvYmFsIFZhcnNcclxuXHJcbnZhciB3b3JsZFJ1biA9IHJlcXVpcmUoXCIuL3dvcmxkL3J1bi5qc1wiKTtcclxuXHJcbnZhciBncmFwaF9mbnMgPSByZXF1aXJlKFwiLi9kcmF3L3Bsb3QtZ3JhcGhzLmpzXCIpO1xyXG52YXIgcGxvdF9ncmFwaHMgPSBncmFwaF9mbnMucGxvdEdyYXBocztcclxuXHJcblxyXG4vLyA9PT09PT09IFdPUkxEIFNUQVRFID09PT09PVxyXG5cclxudmFyICRncmFwaExpc3QgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2dyYXBoLWxpc3RcIik7XHJcbnZhciAkZ3JhcGhUZW1wbGF0ZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIjZ3JhcGgtdGVtcGxhdGVcIik7XHJcblxyXG5mdW5jdGlvbiBzdHJpbmdUb0hUTUwocyl7XHJcbiAgdmFyIHRlbXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICB0ZW1wLmlubmVySFRNTCA9IHM7XHJcbiAgcmV0dXJuIHRlbXAuY2hpbGRyZW5bMF07XHJcbn1cclxuXHJcbnZhciBzdGF0ZXMsIHJ1bm5lcnMsIHJlc3VsdHMsIGdyYXBoU3RhdGUgPSB7fTtcclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVVJKGtleSwgc2NvcmVzKXtcclxuICB2YXIgJGdyYXBoID0gJGdyYXBoTGlzdC5xdWVyeVNlbGVjdG9yKFwiI2dyYXBoLVwiICsga2V5KTtcclxuICB2YXIgJG5ld0dyYXBoID0gc3RyaW5nVG9IVE1MKCRncmFwaFRlbXBsYXRlLmlubmVySFRNTCk7XHJcbiAgJG5ld0dyYXBoLmlkID0gXCJncmFwaC1cIiArIGtleTtcclxuICBpZigkZ3JhcGgpe1xyXG4gICAgJGdyYXBoTGlzdC5yZXBsYWNlQ2hpbGQoJGdyYXBoLCAkbmV3R3JhcGgpO1xyXG4gIH0gZWxzZSB7XHJcbiAgICAkZ3JhcGhMaXN0LmFwcGVuZENoaWxkKCRuZXdHcmFwaCk7XHJcbiAgfVxyXG4gIGNvbnNvbGUubG9nKCRuZXdHcmFwaCk7XHJcbiAgdmFyIHNjYXR0ZXJQbG90RWxlbSA9ICRuZXdHcmFwaC5xdWVyeVNlbGVjdG9yKFwiLnNjYXR0ZXJwbG90XCIpO1xyXG4gIHNjYXR0ZXJQbG90RWxlbS5pZCA9IFwiZ3JhcGgtXCIgKyBrZXkgKyBcIi1zY2F0dGVyXCI7XHJcbiAgZ3JhcGhTdGF0ZVtrZXldID0gcGxvdF9ncmFwaHMoXHJcbiAgICAkbmV3R3JhcGgucXVlcnlTZWxlY3RvcihcIi5ncmFwaGNhbnZhc1wiKSxcclxuICAgICRuZXdHcmFwaC5xdWVyeVNlbGVjdG9yKFwiLnRvcHNjb3Jlc1wiKSxcclxuICAgIHNjYXR0ZXJQbG90RWxlbSxcclxuICAgIGdyYXBoU3RhdGVba2V5XSxcclxuICAgIHNjb3JlcyxcclxuICAgIHt9XHJcbiAgKTtcclxufVxyXG5cclxudmFyIGdlbmVyYXRpb25Db25maWcgPSByZXF1aXJlKFwiLi9nZW5lcmF0aW9uLWNvbmZpZ1wiKTtcclxuXHJcbnZhciBib3gyZGZwcyA9IDYwO1xyXG52YXIgbWF4X2Nhcl9oZWFsdGggPSBib3gyZGZwcyAqIDEwO1xyXG5cclxudmFyIHdvcmxkX2RlZiA9IHtcclxuICBncmF2aXR5OiBuZXcgYjJWZWMyKDAuMCwgLTkuODEpLFxyXG4gIGRvU2xlZXA6IHRydWUsXHJcbiAgZmxvb3JzZWVkOiBidG9hKE1hdGguc2VlZHJhbmRvbSgpKSxcclxuICB0aWxlRGltZW5zaW9uczogbmV3IGIyVmVjMigxLjUsIDAuMTUpLFxyXG4gIG1heEZsb29yVGlsZXM6IDIwMCxcclxuICBtdXRhYmxlX2Zsb29yOiBmYWxzZSxcclxuICBib3gyZGZwczogYm94MmRmcHMsXHJcbiAgbW90b3JTcGVlZDogMjAsXHJcbiAgbWF4X2Nhcl9oZWFsdGg6IG1heF9jYXJfaGVhbHRoLFxyXG4gIHNjaGVtYTogZ2VuZXJhdGlvbkNvbmZpZy5jb25zdGFudHMuc2NoZW1hXHJcbn1cclxuXHJcbnZhciBtYW5hZ2VSb3VuZCA9IHtcclxuICBnZW5ldGljOiByZXF1aXJlKFwiLi9tYWNoaW5lLWxlYXJuaW5nL2dlbmV0aWMtYWxnb3JpdGhtL21hbmFnZS1yb3VuZC5qc1wiKSxcclxuICBhbm5lYWxpbmc6IHJlcXVpcmUoXCIuL21hY2hpbmUtbGVhcm5pbmcvc2ltdWxhdGVkLWFubmVhbGluZy9tYW5hZ2Utcm91bmQuanNcIiksXHJcbn07XHJcblxyXG52YXIgY3JlYXRlTGlzdGVuZXJzID0gZnVuY3Rpb24oa2V5KXtcclxuICByZXR1cm4ge1xyXG4gICAgcHJlQ2FyU3RlcDogZnVuY3Rpb24oKXt9LFxyXG4gICAgY2FyU3RlcDogZnVuY3Rpb24oKXt9LFxyXG4gICAgY2FyRGVhdGg6IGZ1bmN0aW9uKGNhckluZm8pe1xyXG4gICAgICBjYXJJbmZvLnNjb3JlLmkgPSBzdGF0ZXNba2V5XS5jb3VudGVyO1xyXG4gICAgfSxcclxuICAgIGdlbmVyYXRpb25FbmQ6IGZ1bmN0aW9uKHJlc3VsdHMpe1xyXG4gICAgICBoYW5kbGVSb3VuZEVuZChrZXksIHJlc3VsdHMpO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGlvblplcm8oKXtcclxuICB2YXIgb2JqID0gT2JqZWN0LmtleXMobWFuYWdlUm91bmQpLnJlZHVjZShmdW5jdGlvbihvYmosIGtleSl7XHJcbiAgICBvYmouc3RhdGVzW2tleV0gPSBtYW5hZ2VSb3VuZFtrZXldLmdlbmVyYXRpb25aZXJvKGdlbmVyYXRpb25Db25maWcoKSk7XHJcbiAgICBvYmoucnVubmVyc1trZXldID0gd29ybGRSdW4oXHJcbiAgICAgIHdvcmxkX2RlZiwgb2JqLnN0YXRlc1trZXldLmdlbmVyYXRpb24sIGNyZWF0ZUxpc3RlbmVycyhrZXkpXHJcbiAgICApO1xyXG4gICAgb2JqLnJlc3VsdHNba2V5XSA9IFtdO1xyXG4gICAgZ3JhcGhTdGF0ZVtrZXldID0ge31cclxuICAgIHJldHVybiBvYmo7XHJcbiAgfSwge3N0YXRlczoge30sIHJ1bm5lcnM6IHt9LCByZXN1bHRzOiB7fX0pO1xyXG4gIHN0YXRlcyA9IG9iai5zdGF0ZXM7XHJcbiAgcnVubmVycyA9IG9iai5ydW5uZXJzO1xyXG4gIHJlc3VsdHMgPSBvYmoucmVzdWx0cztcclxufVxyXG5cclxuZnVuY3Rpb24gaGFuZGxlUm91bmRFbmQoa2V5LCBzY29yZXMpe1xyXG4gIHZhciBwcmV2aW91c0NvdW50ZXIgPSBzdGF0ZXNba2V5XS5jb3VudGVyO1xyXG4gIHN0YXRlc1trZXldID0gbWFuYWdlUm91bmRba2V5XS5uZXh0R2VuZXJhdGlvbihcclxuICAgIHN0YXRlc1trZXldLCBzY29yZXMsIGdlbmVyYXRpb25Db25maWcoKVxyXG4gICk7XHJcbiAgcnVubmVyc1trZXldID0gd29ybGRSdW4oXHJcbiAgICB3b3JsZF9kZWYsIHN0YXRlc1trZXldLmdlbmVyYXRpb24sIGNyZWF0ZUxpc3RlbmVycyhrZXkpXHJcbiAgKTtcclxuICBpZihzdGF0ZXNba2V5XS5jb3VudGVyID09PSBwcmV2aW91c0NvdW50ZXIpe1xyXG4gICAgY29uc29sZS5sb2cocmVzdWx0cyk7XHJcbiAgICByZXN1bHRzW2tleV0gPSByZXN1bHRzW2tleV0uY29uY2F0KHNjb3Jlcyk7XHJcbiAgfSBlbHNlIHtcclxuICAgIGhhbmRsZUdlbmVyYXRpb25FbmQoa2V5KTtcclxuICAgIHJlc3VsdHNba2V5XSA9IFtdO1xyXG4gIH1cclxufVxyXG5cclxuZnVuY3Rpb24gcnVuUm91bmQoKXtcclxuICB2YXIgdG9SdW4gPSBuZXcgTWFwKCk7XHJcbiAgT2JqZWN0LmtleXMoc3RhdGVzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7IHRvUnVuLnNldChrZXksIHN0YXRlc1trZXldLmNvdW50ZXIpIH0pO1xyXG4gIGNvbnNvbGUubG9nKHRvUnVuKTtcclxuICB3aGlsZSh0b1J1bi5zaXplKXtcclxuICAgIGNvbnNvbGUubG9nKFwicnVubmluZ1wiKTtcclxuICAgIEFycmF5LmZyb20odG9SdW4ua2V5cygpKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XHJcbiAgICAgIGlmKHN0YXRlc1trZXldLmNvdW50ZXIgPT09IHRvUnVuLmdldChrZXkpKXtcclxuICAgICAgICBydW5uZXJzW2tleV0uc3RlcCgpO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRvUnVuLmRlbGV0ZShrZXkpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGhhbmRsZUdlbmVyYXRpb25FbmQoa2V5KXtcclxuICB2YXIgc2NvcmVzID0gcmVzdWx0c1trZXldO1xyXG4gIHNjb3Jlcy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICBpZiAoYS5zY29yZS52ID4gYi5zY29yZS52KSB7XHJcbiAgICAgIHJldHVybiAtMVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIDFcclxuICAgIH1cclxuICB9KVxyXG4gIHVwZGF0ZVVJKGtleSwgc2NvcmVzKTtcclxuICByZXN1bHRzW2tleV0gPSBbXTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfcmVzZXRQb3B1bGF0aW9uVUkoKSB7XHJcbiAgJGdyYXBoTGlzdC5pbm5lckhUTUwgPSBcIlwiO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19yZXNldFdvcmxkKCkge1xyXG4gIGN3X3Jlc2V0UG9wdWxhdGlvblVJKCk7XHJcbiAgTWF0aC5zZWVkcmFuZG9tKCk7XHJcbiAgZ2VuZXJhdGlvblplcm8oKTtcclxufVxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNuZXctcG9wdWxhdGlvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcclxuICBjd19yZXNldFBvcHVsYXRpb25VSSgpXHJcbiAgZ2VuZXJhdGlvblplcm8oKTtcclxufSlcclxuXHJcblxyXG5kb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2NvbmZpcm0tcmVzZXRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XHJcbiAgY3dfY29uZmlybVJlc2V0V29ybGQoKVxyXG59KVxyXG5cclxuZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNmYXN0LWZvcndhcmRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XHJcbiAgcnVuUm91bmQoKTtcclxufSlcclxuXHJcbmZ1bmN0aW9uIGN3X2NvbmZpcm1SZXNldFdvcmxkKCkge1xyXG4gIGlmIChjb25maXJtKCdSZWFsbHkgcmVzZXQgd29ybGQ/JykpIHtcclxuICAgIGN3X3Jlc2V0V29ybGQoKTtcclxuICB9IGVsc2Uge1xyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG4gIH1cclxufVxyXG5cclxuY3dfcmVzZXRXb3JsZCgpO1xyXG4iLCJtb2R1bGUuZXhwb3J0cz17XHJcbiAgXCJ3aGVlbENvdW50XCI6IDIsXHJcbiAgXCJ3aGVlbE1pblJhZGl1c1wiOiAwLjIsXHJcbiAgXCJ3aGVlbFJhZGl1c1JhbmdlXCI6IDAuNSxcclxuICBcIndoZWVsTWluRGVuc2l0eVwiOiA0MCxcclxuICBcIndoZWVsRGVuc2l0eVJhbmdlXCI6IDEwMCxcclxuICBcImNoYXNzaXNEZW5zaXR5UmFuZ2VcIjogMzAwLFxyXG4gIFwiY2hhc3Npc01pbkRlbnNpdHlcIjogMzAsXHJcbiAgXCJjaGFzc2lzTWluQXhpc1wiOiAwLjEsXHJcbiAgXCJjaGFzc2lzQXhpc1JhbmdlXCI6IDEuMVxyXG59XHJcbiIsInZhciBjYXJDb25zdGFudHMgPSByZXF1aXJlKFwiLi9jYXItY29uc3RhbnRzLmpzb25cIik7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICB3b3JsZERlZjogd29ybGREZWYsXHJcbiAgY2FyQ29uc3RhbnRzOiBnZXRDYXJDb25zdGFudHMsXHJcbiAgZ2VuZXJhdGVTY2hlbWE6IGdlbmVyYXRlU2NoZW1hXHJcbn1cclxuXHJcbmZ1bmN0aW9uIHdvcmxkRGVmKCl7XHJcbiAgdmFyIGJveDJkZnBzID0gNjA7XHJcbiAgcmV0dXJuIHtcclxuICAgIGdyYXZpdHk6IHsgeTogMCB9LFxyXG4gICAgZG9TbGVlcDogdHJ1ZSxcclxuICAgIGZsb29yc2VlZDogXCJhYmNcIixcclxuICAgIG1heEZsb29yVGlsZXM6IDIwMCxcclxuICAgIG11dGFibGVfZmxvb3I6IGZhbHNlLFxyXG4gICAgbW90b3JTcGVlZDogMjAsXHJcbiAgICBib3gyZGZwczogYm94MmRmcHMsXHJcbiAgICBtYXhfY2FyX2hlYWx0aDogYm94MmRmcHMgKiAxMCxcclxuICAgIHRpbGVEaW1lbnNpb25zOiB7XHJcbiAgICAgIHdpZHRoOiAxLjUsXHJcbiAgICAgIGhlaWdodDogMC4xNVxyXG4gICAgfVxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldENhckNvbnN0YW50cygpe1xyXG4gIHJldHVybiBjYXJDb25zdGFudHM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdlbmVyYXRlU2NoZW1hKHZhbHVlcyl7XHJcbiAgcmV0dXJuIHtcclxuICAgIHdoZWVsX3JhZGl1czoge1xyXG4gICAgICB0eXBlOiBcImZsb2F0XCIsXHJcbiAgICAgIGxlbmd0aDogdmFsdWVzLndoZWVsQ291bnQsXHJcbiAgICAgIG1pbjogdmFsdWVzLndoZWVsTWluUmFkaXVzLFxyXG4gICAgICByYW5nZTogdmFsdWVzLndoZWVsUmFkaXVzUmFuZ2UsXHJcbiAgICAgIGZhY3RvcjogMSxcclxuICAgIH0sXHJcbiAgICB3aGVlbF9kZW5zaXR5OiB7XHJcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcclxuICAgICAgbGVuZ3RoOiB2YWx1ZXMud2hlZWxDb3VudCxcclxuICAgICAgbWluOiB2YWx1ZXMud2hlZWxNaW5EZW5zaXR5LFxyXG4gICAgICByYW5nZTogdmFsdWVzLndoZWVsRGVuc2l0eVJhbmdlLFxyXG4gICAgICBmYWN0b3I6IDEsXHJcbiAgICB9LFxyXG4gICAgY2hhc3Npc19kZW5zaXR5OiB7XHJcbiAgICAgIHR5cGU6IFwiZmxvYXRcIixcclxuICAgICAgbGVuZ3RoOiAxLFxyXG4gICAgICBtaW46IHZhbHVlcy5jaGFzc2lzRGVuc2l0eVJhbmdlLFxyXG4gICAgICByYW5nZTogdmFsdWVzLmNoYXNzaXNNaW5EZW5zaXR5LFxyXG4gICAgICBmYWN0b3I6IDEsXHJcbiAgICB9LFxyXG4gICAgdmVydGV4X2xpc3Q6IHtcclxuICAgICAgdHlwZTogXCJmbG9hdFwiLFxyXG4gICAgICBsZW5ndGg6IDEyLFxyXG4gICAgICBtaW46IHZhbHVlcy5jaGFzc2lzTWluQXhpcyxcclxuICAgICAgcmFuZ2U6IHZhbHVlcy5jaGFzc2lzQXhpc1JhbmdlLFxyXG4gICAgICBmYWN0b3I6IDEsXHJcbiAgICB9LFxyXG4gICAgd2hlZWxfdmVydGV4OiB7XHJcbiAgICAgIHR5cGU6IFwic2h1ZmZsZVwiLFxyXG4gICAgICBsZW5ndGg6IDgsXHJcbiAgICAgIGxpbWl0OiB2YWx1ZXMud2hlZWxDb3VudCxcclxuICAgICAgZmFjdG9yOiAxLFxyXG4gICAgfSxcclxuICB9O1xyXG59XHJcbiIsIi8qXHJcbiAgZ2xvYmFscyBiMlJldm9sdXRlSm9pbnREZWYgYjJWZWMyIGIyQm9keURlZiBiMkJvZHkgYjJGaXh0dXJlRGVmIGIyUG9seWdvblNoYXBlIGIyQ2lyY2xlU2hhcGVcclxuKi9cclxuXHJcbnZhciBjcmVhdGVJbnN0YW5jZSA9IHJlcXVpcmUoXCIuLi9tYWNoaW5lLWxlYXJuaW5nL2NyZWF0ZS1pbnN0YW5jZVwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZGVmVG9DYXI7XHJcblxyXG5mdW5jdGlvbiBkZWZUb0Nhcihub3JtYWxfZGVmLCB3b3JsZCwgY29uc3RhbnRzKXtcclxuICB2YXIgY2FyX2RlZiA9IGNyZWF0ZUluc3RhbmNlLmFwcGx5VHlwZXMoY29uc3RhbnRzLnNjaGVtYSwgbm9ybWFsX2RlZilcclxuICB2YXIgaW5zdGFuY2UgPSB7fTtcclxuICBpbnN0YW5jZS5jaGFzc2lzID0gY3JlYXRlQ2hhc3NpcyhcclxuICAgIHdvcmxkLCBjYXJfZGVmLnZlcnRleF9saXN0LCBjYXJfZGVmLmNoYXNzaXNfZGVuc2l0eVxyXG4gICk7XHJcbiAgdmFyIGk7XHJcblxyXG4gIHZhciB3aGVlbENvdW50ID0gY2FyX2RlZi53aGVlbF9yYWRpdXMubGVuZ3RoO1xyXG5cclxuICBpbnN0YW5jZS53aGVlbHMgPSBbXTtcclxuICBmb3IgKGkgPSAwOyBpIDwgd2hlZWxDb3VudDsgaSsrKSB7XHJcbiAgICBpbnN0YW5jZS53aGVlbHNbaV0gPSBjcmVhdGVXaGVlbChcclxuICAgICAgd29ybGQsXHJcbiAgICAgIGNhcl9kZWYud2hlZWxfcmFkaXVzW2ldLFxyXG4gICAgICBjYXJfZGVmLndoZWVsX2RlbnNpdHlbaV1cclxuICAgICk7XHJcbiAgfVxyXG5cclxuICB2YXIgY2FybWFzcyA9IGluc3RhbmNlLmNoYXNzaXMuR2V0TWFzcygpO1xyXG4gIGZvciAoaSA9IDA7IGkgPCB3aGVlbENvdW50OyBpKyspIHtcclxuICAgIGNhcm1hc3MgKz0gaW5zdGFuY2Uud2hlZWxzW2ldLkdldE1hc3MoKTtcclxuICB9XHJcblxyXG4gIHZhciBqb2ludF9kZWYgPSBuZXcgYjJSZXZvbHV0ZUpvaW50RGVmKCk7XHJcblxyXG4gIGZvciAoaSA9IDA7IGkgPCB3aGVlbENvdW50OyBpKyspIHtcclxuICAgIHZhciB0b3JxdWUgPSBjYXJtYXNzICogLWNvbnN0YW50cy5ncmF2aXR5LnkgLyBjYXJfZGVmLndoZWVsX3JhZGl1c1tpXTtcclxuXHJcbiAgICB2YXIgcmFuZHZlcnRleCA9IGluc3RhbmNlLmNoYXNzaXMudmVydGV4X2xpc3RbY2FyX2RlZi53aGVlbF92ZXJ0ZXhbaV1dO1xyXG4gICAgam9pbnRfZGVmLmxvY2FsQW5jaG9yQS5TZXQocmFuZHZlcnRleC54LCByYW5kdmVydGV4LnkpO1xyXG4gICAgam9pbnRfZGVmLmxvY2FsQW5jaG9yQi5TZXQoMCwgMCk7XHJcbiAgICBqb2ludF9kZWYubWF4TW90b3JUb3JxdWUgPSB0b3JxdWU7XHJcbiAgICBqb2ludF9kZWYubW90b3JTcGVlZCA9IC1jb25zdGFudHMubW90b3JTcGVlZDtcclxuICAgIGpvaW50X2RlZi5lbmFibGVNb3RvciA9IHRydWU7XHJcbiAgICBqb2ludF9kZWYuYm9keUEgPSBpbnN0YW5jZS5jaGFzc2lzO1xyXG4gICAgam9pbnRfZGVmLmJvZHlCID0gaW5zdGFuY2Uud2hlZWxzW2ldO1xyXG4gICAgd29ybGQuQ3JlYXRlSm9pbnQoam9pbnRfZGVmKTtcclxuICB9XHJcblxyXG4gIHJldHVybiBpbnN0YW5jZTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlQ2hhc3Npcyh3b3JsZCwgdmVydGV4cywgZGVuc2l0eSkge1xyXG5cclxuICB2YXIgdmVydGV4X2xpc3QgPSBuZXcgQXJyYXkoKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIodmVydGV4c1swXSwgMCkpO1xyXG4gIHZlcnRleF9saXN0LnB1c2gobmV3IGIyVmVjMih2ZXJ0ZXhzWzFdLCB2ZXJ0ZXhzWzJdKSk7XHJcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKDAsIHZlcnRleHNbM10pKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoLXZlcnRleHNbNF0sIHZlcnRleHNbNV0pKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoLXZlcnRleHNbNl0sIDApKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKG5ldyBiMlZlYzIoLXZlcnRleHNbN10sIC12ZXJ0ZXhzWzhdKSk7XHJcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKDAsIC12ZXJ0ZXhzWzldKSk7XHJcbiAgdmVydGV4X2xpc3QucHVzaChuZXcgYjJWZWMyKHZlcnRleHNbMTBdLCAtdmVydGV4c1sxMV0pKTtcclxuXHJcbiAgdmFyIGJvZHlfZGVmID0gbmV3IGIyQm9keURlZigpO1xyXG4gIGJvZHlfZGVmLnR5cGUgPSBiMkJvZHkuYjJfZHluYW1pY0JvZHk7XHJcbiAgYm9keV9kZWYucG9zaXRpb24uU2V0KDAuMCwgNC4wKTtcclxuXHJcbiAgdmFyIGJvZHkgPSB3b3JsZC5DcmVhdGVCb2R5KGJvZHlfZGVmKTtcclxuXHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbMF0sIHZlcnRleF9saXN0WzFdLCBkZW5zaXR5KTtcclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFsxXSwgdmVydGV4X2xpc3RbMl0sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzJdLCB2ZXJ0ZXhfbGlzdFszXSwgZGVuc2l0eSk7XHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbM10sIHZlcnRleF9saXN0WzRdLCBkZW5zaXR5KTtcclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFs0XSwgdmVydGV4X2xpc3RbNV0sIGRlbnNpdHkpO1xyXG4gIGNyZWF0ZUNoYXNzaXNQYXJ0KGJvZHksIHZlcnRleF9saXN0WzVdLCB2ZXJ0ZXhfbGlzdFs2XSwgZGVuc2l0eSk7XHJcbiAgY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4X2xpc3RbNl0sIHZlcnRleF9saXN0WzddLCBkZW5zaXR5KTtcclxuICBjcmVhdGVDaGFzc2lzUGFydChib2R5LCB2ZXJ0ZXhfbGlzdFs3XSwgdmVydGV4X2xpc3RbMF0sIGRlbnNpdHkpO1xyXG5cclxuICBib2R5LnZlcnRleF9saXN0ID0gdmVydGV4X2xpc3Q7XHJcblxyXG4gIHJldHVybiBib2R5O1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gY3JlYXRlQ2hhc3Npc1BhcnQoYm9keSwgdmVydGV4MSwgdmVydGV4MiwgZGVuc2l0eSkge1xyXG4gIHZhciB2ZXJ0ZXhfbGlzdCA9IG5ldyBBcnJheSgpO1xyXG4gIHZlcnRleF9saXN0LnB1c2godmVydGV4MSk7XHJcbiAgdmVydGV4X2xpc3QucHVzaCh2ZXJ0ZXgyKTtcclxuICB2ZXJ0ZXhfbGlzdC5wdXNoKGIyVmVjMi5NYWtlKDAsIDApKTtcclxuICB2YXIgZml4X2RlZiA9IG5ldyBiMkZpeHR1cmVEZWYoKTtcclxuICBmaXhfZGVmLnNoYXBlID0gbmV3IGIyUG9seWdvblNoYXBlKCk7XHJcbiAgZml4X2RlZi5kZW5zaXR5ID0gZGVuc2l0eTtcclxuICBmaXhfZGVmLmZyaWN0aW9uID0gMTA7XHJcbiAgZml4X2RlZi5yZXN0aXR1dGlvbiA9IDAuMjtcclxuICBmaXhfZGVmLmZpbHRlci5ncm91cEluZGV4ID0gLTE7XHJcbiAgZml4X2RlZi5zaGFwZS5TZXRBc0FycmF5KHZlcnRleF9saXN0LCAzKTtcclxuXHJcbiAgYm9keS5DcmVhdGVGaXh0dXJlKGZpeF9kZWYpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVXaGVlbCh3b3JsZCwgcmFkaXVzLCBkZW5zaXR5KSB7XHJcbiAgdmFyIGJvZHlfZGVmID0gbmV3IGIyQm9keURlZigpO1xyXG4gIGJvZHlfZGVmLnR5cGUgPSBiMkJvZHkuYjJfZHluYW1pY0JvZHk7XHJcbiAgYm9keV9kZWYucG9zaXRpb24uU2V0KDAsIDApO1xyXG5cclxuICB2YXIgYm9keSA9IHdvcmxkLkNyZWF0ZUJvZHkoYm9keV9kZWYpO1xyXG5cclxuICB2YXIgZml4X2RlZiA9IG5ldyBiMkZpeHR1cmVEZWYoKTtcclxuICBmaXhfZGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUocmFkaXVzKTtcclxuICBmaXhfZGVmLmRlbnNpdHkgPSBkZW5zaXR5O1xyXG4gIGZpeF9kZWYuZnJpY3Rpb24gPSAxO1xyXG4gIGZpeF9kZWYucmVzdGl0dXRpb24gPSAwLjI7XHJcbiAgZml4X2RlZi5maWx0ZXIuZ3JvdXBJbmRleCA9IC0xO1xyXG5cclxuICBib2R5LkNyZWF0ZUZpeHR1cmUoZml4X2RlZik7XHJcbiAgcmV0dXJuIGJvZHk7XHJcbn1cclxuIiwiXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuICBnZXRJbml0aWFsU3RhdGU6IGdldEluaXRpYWxTdGF0ZSxcclxuICB1cGRhdGVTdGF0ZTogdXBkYXRlU3RhdGUsXHJcbiAgZ2V0U3RhdHVzOiBnZXRTdGF0dXMsXHJcbiAgY2FsY3VsYXRlU2NvcmU6IGNhbGN1bGF0ZVNjb3JlLFxyXG59O1xyXG5cclxuZnVuY3Rpb24gZ2V0SW5pdGlhbFN0YXRlKHdvcmxkX2RlZil7XHJcbiAgcmV0dXJuIHtcclxuICAgIGZyYW1lczogMCxcclxuICAgIGhlYWx0aDogd29ybGRfZGVmLm1heF9jYXJfaGVhbHRoLFxyXG4gICAgbWF4UG9zaXRpb255OiAwLFxyXG4gICAgbWluUG9zaXRpb255OiAwLFxyXG4gICAgbWF4UG9zaXRpb254OiAwLFxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHVwZGF0ZVN0YXRlKGNvbnN0YW50cywgd29ybGRDb25zdHJ1Y3QsIHN0YXRlKXtcclxuICBpZihzdGF0ZS5oZWFsdGggPD0gMCl7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJBbHJlYWR5IERlYWRcIik7XHJcbiAgfVxyXG4gIGlmKHN0YXRlLm1heFBvc2l0aW9ueCA+IGNvbnN0YW50cy5maW5pc2hMaW5lKXtcclxuICAgIHRocm93IG5ldyBFcnJvcihcImFscmVhZHkgRmluaXNoZWRcIik7XHJcbiAgfVxyXG5cclxuICAvLyBjb25zb2xlLmxvZyhzdGF0ZSk7XHJcbiAgLy8gY2hlY2sgaGVhbHRoXHJcbiAgdmFyIHBvc2l0aW9uID0gd29ybGRDb25zdHJ1Y3QuY2hhc3Npcy5HZXRQb3NpdGlvbigpO1xyXG4gIC8vIGNoZWNrIGlmIGNhciByZWFjaGVkIGVuZCBvZiB0aGUgcGF0aFxyXG4gIHZhciBuZXh0U3RhdGUgPSB7XHJcbiAgICBmcmFtZXM6IHN0YXRlLmZyYW1lcyArIDEsXHJcbiAgICBtYXhQb3NpdGlvbng6IHBvc2l0aW9uLnggPiBzdGF0ZS5tYXhQb3NpdGlvbnggPyBwb3NpdGlvbi54IDogc3RhdGUubWF4UG9zaXRpb254LFxyXG4gICAgbWF4UG9zaXRpb255OiBwb3NpdGlvbi55ID4gc3RhdGUubWF4UG9zaXRpb255ID8gcG9zaXRpb24ueSA6IHN0YXRlLm1heFBvc2l0aW9ueSxcclxuICAgIG1pblBvc2l0aW9ueTogcG9zaXRpb24ueSA8IHN0YXRlLm1pblBvc2l0aW9ueSA/IHBvc2l0aW9uLnkgOiBzdGF0ZS5taW5Qb3NpdGlvbnlcclxuICB9O1xyXG5cclxuICBpZiAocG9zaXRpb24ueCA+IGNvbnN0YW50cy5maW5pc2hMaW5lKSB7XHJcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xyXG4gIH1cclxuXHJcbiAgaWYgKHBvc2l0aW9uLnggPiBzdGF0ZS5tYXhQb3NpdGlvbnggKyAwLjAyKSB7XHJcbiAgICBuZXh0U3RhdGUuaGVhbHRoID0gY29uc3RhbnRzLm1heF9jYXJfaGVhbHRoO1xyXG4gICAgcmV0dXJuIG5leHRTdGF0ZTtcclxuICB9XHJcbiAgbmV4dFN0YXRlLmhlYWx0aCA9IHN0YXRlLmhlYWx0aCAtIDE7XHJcbiAgaWYgKE1hdGguYWJzKHdvcmxkQ29uc3RydWN0LmNoYXNzaXMuR2V0TGluZWFyVmVsb2NpdHkoKS54KSA8IDAuMDAxKSB7XHJcbiAgICBuZXh0U3RhdGUuaGVhbHRoIC09IDU7XHJcbiAgfVxyXG4gIHJldHVybiBuZXh0U3RhdGU7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGdldFN0YXR1cyhzdGF0ZSwgY29uc3RhbnRzKXtcclxuICBpZihoYXNGYWlsZWQoc3RhdGUsIGNvbnN0YW50cykpIHJldHVybiAtMTtcclxuICBpZihoYXNTdWNjZXNzKHN0YXRlLCBjb25zdGFudHMpKSByZXR1cm4gMTtcclxuICByZXR1cm4gMDtcclxufVxyXG5cclxuZnVuY3Rpb24gaGFzRmFpbGVkKHN0YXRlIC8qLCBjb25zdGFudHMgKi8pe1xyXG4gIHJldHVybiBzdGF0ZS5oZWFsdGggPD0gMDtcclxufVxyXG5mdW5jdGlvbiBoYXNTdWNjZXNzKHN0YXRlLCBjb25zdGFudHMpe1xyXG4gIHJldHVybiBzdGF0ZS5tYXhQb3NpdGlvbnggPiBjb25zdGFudHMuZmluaXNoTGluZTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2FsY3VsYXRlU2NvcmUoc3RhdGUsIGNvbnN0YW50cyl7XHJcbiAgdmFyIGF2Z3NwZWVkID0gKHN0YXRlLm1heFBvc2l0aW9ueCAvIHN0YXRlLmZyYW1lcykgKiBjb25zdGFudHMuYm94MmRmcHM7XHJcbiAgdmFyIHBvc2l0aW9uID0gc3RhdGUubWF4UG9zaXRpb254O1xyXG4gIHZhciBzY29yZSA9IHBvc2l0aW9uICsgYXZnc3BlZWQ7XHJcbiAgcmV0dXJuIHtcclxuICAgIHY6IHNjb3JlLFxyXG4gICAgczogYXZnc3BlZWQsXHJcbiAgICB4OiBwb3NpdGlvbixcclxuICAgIHk6IHN0YXRlLm1heFBvc2l0aW9ueSxcclxuICAgIHkyOiBzdGF0ZS5taW5Qb3NpdGlvbnlcclxuICB9XHJcbn1cclxuIiwidmFyIHNjYXR0ZXJQbG90ID0gcmVxdWlyZShcIi4vc2NhdHRlci1wbG90XCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgcGxvdEdyYXBoczogZnVuY3Rpb24oZ3JhcGhFbGVtLCB0b3BTY29yZXNFbGVtLCBzY2F0dGVyUGxvdEVsZW0sIGxhc3RTdGF0ZSwgc2NvcmVzLCBjb25maWcpIHtcclxuICAgIGxhc3RTdGF0ZSA9IGxhc3RTdGF0ZSB8fCB7fTtcclxuICAgIHZhciBnZW5lcmF0aW9uU2l6ZSA9IHNjb3Jlcy5sZW5ndGhcclxuICAgIHZhciBncmFwaGNhbnZhcyA9IGdyYXBoRWxlbTtcclxuICAgIHZhciBncmFwaGN0eCA9IGdyYXBoY2FudmFzLmdldENvbnRleHQoXCIyZFwiKTtcclxuICAgIHZhciBncmFwaHdpZHRoID0gNDAwO1xyXG4gICAgdmFyIGdyYXBoaGVpZ2h0ID0gMjUwO1xyXG4gICAgdmFyIG5leHRTdGF0ZSA9IGN3X3N0b3JlR3JhcGhTY29yZXMoXHJcbiAgICAgIGxhc3RTdGF0ZSwgc2NvcmVzLCBnZW5lcmF0aW9uU2l6ZVxyXG4gICAgKTtcclxuICAgIGNvbnNvbGUubG9nKHNjb3JlcywgbmV4dFN0YXRlKTtcclxuICAgIGN3X2NsZWFyR3JhcGhpY3MoZ3JhcGhjYW52YXMsIGdyYXBoY3R4LCBncmFwaHdpZHRoLCBncmFwaGhlaWdodCk7XHJcbiAgICBjd19wbG90QXZlcmFnZShuZXh0U3RhdGUsIGdyYXBoY3R4KTtcclxuICAgIGN3X3Bsb3RFbGl0ZShuZXh0U3RhdGUsIGdyYXBoY3R4KTtcclxuICAgIGN3X3Bsb3RUb3AobmV4dFN0YXRlLCBncmFwaGN0eCk7XHJcbiAgICBjd19saXN0VG9wU2NvcmVzKHRvcFNjb3Jlc0VsZW0sIG5leHRTdGF0ZSk7XHJcbiAgICBuZXh0U3RhdGUuc2NhdHRlckdyYXBoID0gZHJhd0FsbFJlc3VsdHMoXHJcbiAgICAgIHNjYXR0ZXJQbG90RWxlbSwgY29uZmlnLCBuZXh0U3RhdGUsIGxhc3RTdGF0ZS5zY2F0dGVyR3JhcGhcclxuICAgICk7XHJcbiAgICByZXR1cm4gbmV4dFN0YXRlO1xyXG4gIH0sXHJcbiAgY2xlYXJHcmFwaGljczogZnVuY3Rpb24oZ3JhcGhFbGVtKSB7XHJcbiAgICB2YXIgZ3JhcGhjYW52YXMgPSBncmFwaEVsZW07XHJcbiAgICB2YXIgZ3JhcGhjdHggPSBncmFwaGNhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XHJcbiAgICB2YXIgZ3JhcGh3aWR0aCA9IDQwMDtcclxuICAgIHZhciBncmFwaGhlaWdodCA9IDI1MDtcclxuICAgIGN3X2NsZWFyR3JhcGhpY3MoZ3JhcGhjYW52YXMsIGdyYXBoY3R4LCBncmFwaHdpZHRoLCBncmFwaGhlaWdodCk7XHJcbiAgfVxyXG59O1xyXG5cclxuXHJcbmZ1bmN0aW9uIGN3X3N0b3JlR3JhcGhTY29yZXMobGFzdFN0YXRlLCBjd19jYXJTY29yZXMsIGdlbmVyYXRpb25TaXplKSB7XHJcbiAgY29uc29sZS5sb2coY3dfY2FyU2NvcmVzKTtcclxuICByZXR1cm4ge1xyXG4gICAgY3dfdG9wU2NvcmVzOiAobGFzdFN0YXRlLmN3X3RvcFNjb3JlcyB8fCBbXSlcclxuICAgIC5jb25jYXQoW2N3X2NhclNjb3Jlc1swXS5zY29yZV0pLFxyXG4gICAgY3dfZ3JhcGhBdmVyYWdlOiAobGFzdFN0YXRlLmN3X2dyYXBoQXZlcmFnZSB8fCBbXSkuY29uY2F0KFtcclxuICAgICAgY3dfYXZlcmFnZShjd19jYXJTY29yZXMsIGdlbmVyYXRpb25TaXplKVxyXG4gICAgXSksXHJcbiAgICBjd19ncmFwaEVsaXRlOiAobGFzdFN0YXRlLmN3X2dyYXBoRWxpdGUgfHwgW10pLmNvbmNhdChbXHJcbiAgICAgIGN3X2VsaXRlYXZlcmFnZShjd19jYXJTY29yZXMsIGdlbmVyYXRpb25TaXplKVxyXG4gICAgXSksXHJcbiAgICBjd19ncmFwaFRvcDogKGxhc3RTdGF0ZS5jd19ncmFwaFRvcCB8fCBbXSkuY29uY2F0KFtcclxuICAgICAgY3dfY2FyU2NvcmVzWzBdLnNjb3JlLnZcclxuICAgIF0pLFxyXG4gICAgYWxsUmVzdWx0czogKGxhc3RTdGF0ZS5hbGxSZXN1bHRzIHx8IFtdKS5jb25jYXQoY3dfY2FyU2NvcmVzKSxcclxuICB9XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X3Bsb3RUb3Aoc3RhdGUsIGdyYXBoY3R4KSB7XHJcbiAgdmFyIGN3X2dyYXBoVG9wID0gc3RhdGUuY3dfZ3JhcGhUb3A7XHJcbiAgdmFyIGdyYXBoc2l6ZSA9IGN3X2dyYXBoVG9wLmxlbmd0aDtcclxuICBncmFwaGN0eC5zdHJva2VTdHlsZSA9IFwiI0M4M0IzQlwiO1xyXG4gIGdyYXBoY3R4LmJlZ2luUGF0aCgpO1xyXG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IGdyYXBoc2l6ZTsgaysrKSB7XHJcbiAgICBncmFwaGN0eC5saW5lVG8oNDAwICogKGsgKyAxKSAvIGdyYXBoc2l6ZSwgY3dfZ3JhcGhUb3Bba10pO1xyXG4gIH1cclxuICBncmFwaGN0eC5zdHJva2UoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfcGxvdEVsaXRlKHN0YXRlLCBncmFwaGN0eCkge1xyXG4gIHZhciBjd19ncmFwaEVsaXRlID0gc3RhdGUuY3dfZ3JhcGhFbGl0ZTtcclxuICB2YXIgZ3JhcGhzaXplID0gY3dfZ3JhcGhFbGl0ZS5sZW5ndGg7XHJcbiAgZ3JhcGhjdHguc3Ryb2tlU3R5bGUgPSBcIiM3QkM3NERcIjtcclxuICBncmFwaGN0eC5iZWdpblBhdGgoKTtcclxuICBncmFwaGN0eC5tb3ZlVG8oMCwgMCk7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBncmFwaHNpemU7IGsrKykge1xyXG4gICAgZ3JhcGhjdHgubGluZVRvKDQwMCAqIChrICsgMSkgLyBncmFwaHNpemUsIGN3X2dyYXBoRWxpdGVba10pO1xyXG4gIH1cclxuICBncmFwaGN0eC5zdHJva2UoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfcGxvdEF2ZXJhZ2Uoc3RhdGUsIGdyYXBoY3R4KSB7XHJcbiAgdmFyIGN3X2dyYXBoQXZlcmFnZSA9IHN0YXRlLmN3X2dyYXBoQXZlcmFnZTtcclxuICB2YXIgZ3JhcGhzaXplID0gY3dfZ3JhcGhBdmVyYWdlLmxlbmd0aDtcclxuICBncmFwaGN0eC5zdHJva2VTdHlsZSA9IFwiIzNGNzJBRlwiO1xyXG4gIGdyYXBoY3R4LmJlZ2luUGF0aCgpO1xyXG4gIGdyYXBoY3R4Lm1vdmVUbygwLCAwKTtcclxuICBmb3IgKHZhciBrID0gMDsgayA8IGdyYXBoc2l6ZTsgaysrKSB7XHJcbiAgICBncmFwaGN0eC5saW5lVG8oNDAwICogKGsgKyAxKSAvIGdyYXBoc2l6ZSwgY3dfZ3JhcGhBdmVyYWdlW2tdKTtcclxuICB9XHJcbiAgZ3JhcGhjdHguc3Ryb2tlKCk7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjd19lbGl0ZWF2ZXJhZ2Uoc2NvcmVzLCBnZW5lcmF0aW9uU2l6ZSkge1xyXG4gIHZhciBzdW0gPSAwO1xyXG4gIGZvciAodmFyIGsgPSAwOyBrIDwgTWF0aC5mbG9vcihnZW5lcmF0aW9uU2l6ZSAvIDIpOyBrKyspIHtcclxuICAgIHN1bSArPSBzY29yZXNba10uc2NvcmUudjtcclxuICB9XHJcbiAgcmV0dXJuIHN1bSAvIE1hdGguZmxvb3IoZ2VuZXJhdGlvblNpemUgLyAyKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfYXZlcmFnZShzY29yZXMsIGdlbmVyYXRpb25TaXplKSB7XHJcbiAgdmFyIHN1bSA9IDA7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBnZW5lcmF0aW9uU2l6ZTsgaysrKSB7XHJcbiAgICBzdW0gKz0gc2NvcmVzW2tdLnNjb3JlLnY7XHJcbiAgfVxyXG4gIHJldHVybiBzdW0gLyBnZW5lcmF0aW9uU2l6ZTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfY2xlYXJHcmFwaGljcyhncmFwaGNhbnZhcywgZ3JhcGhjdHgsIGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0KSB7XHJcbiAgZ3JhcGhjYW52YXMud2lkdGggPSBncmFwaGNhbnZhcy53aWR0aDtcclxuICBncmFwaGN0eC50cmFuc2xhdGUoMCwgZ3JhcGhoZWlnaHQpO1xyXG4gIGdyYXBoY3R4LnNjYWxlKDEsIC0xKTtcclxuICBncmFwaGN0eC5saW5lV2lkdGggPSAxO1xyXG4gIGdyYXBoY3R4LnN0cm9rZVN0eWxlID0gXCIjM0Y3MkFGXCI7XHJcbiAgZ3JhcGhjdHguYmVnaW5QYXRoKCk7XHJcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIGdyYXBoaGVpZ2h0IC8gMik7XHJcbiAgZ3JhcGhjdHgubGluZVRvKGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0IC8gMik7XHJcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIGdyYXBoaGVpZ2h0IC8gNCk7XHJcbiAgZ3JhcGhjdHgubGluZVRvKGdyYXBod2lkdGgsIGdyYXBoaGVpZ2h0IC8gNCk7XHJcbiAgZ3JhcGhjdHgubW92ZVRvKDAsIGdyYXBoaGVpZ2h0ICogMyAvIDQpO1xyXG4gIGdyYXBoY3R4LmxpbmVUbyhncmFwaHdpZHRoLCBncmFwaGhlaWdodCAqIDMgLyA0KTtcclxuICBncmFwaGN0eC5zdHJva2UoKTtcclxufVxyXG5cclxuZnVuY3Rpb24gY3dfbGlzdFRvcFNjb3JlcyhlbGVtLCBzdGF0ZSkge1xyXG4gIHZhciBjd190b3BTY29yZXMgPSBzdGF0ZS5jd190b3BTY29yZXM7XHJcbiAgdmFyIHRzID0gZWxlbTtcclxuICB0cy5pbm5lckhUTUwgPSBcIjxiPlRvcCBTY29yZXM6PC9iPjxiciAvPlwiO1xyXG4gIGN3X3RvcFNjb3Jlcy5zb3J0KGZ1bmN0aW9uIChhLCBiKSB7XHJcbiAgICBpZiAoYS52ID4gYi52KSB7XHJcbiAgICAgIHJldHVybiAtMVxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgcmV0dXJuIDFcclxuICAgIH1cclxuICB9KTtcclxuXHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBNYXRoLm1pbigxMCwgY3dfdG9wU2NvcmVzLmxlbmd0aCk7IGsrKykge1xyXG4gICAgdmFyIHRvcFNjb3JlID0gY3dfdG9wU2NvcmVzW2tdO1xyXG4gICAgLy8gY29uc29sZS5sb2codG9wU2NvcmUpO1xyXG4gICAgdmFyIG4gPSBcIiNcIiArIChrICsgMSkgKyBcIjpcIjtcclxuICAgIHZhciBzY29yZSA9IE1hdGgucm91bmQodG9wU2NvcmUudiAqIDEwMCkgLyAxMDA7XHJcbiAgICB2YXIgZGlzdGFuY2UgPSBcImQ6XCIgKyBNYXRoLnJvdW5kKHRvcFNjb3JlLnggKiAxMDApIC8gMTAwO1xyXG4gICAgdmFyIHlyYW5nZSA9ICBcImg6XCIgKyBNYXRoLnJvdW5kKHRvcFNjb3JlLnkyICogMTAwKSAvIDEwMCArIFwiL1wiICsgTWF0aC5yb3VuZCh0b3BTY29yZS55ICogMTAwKSAvIDEwMCArIFwibVwiO1xyXG4gICAgdmFyIGdlbiA9IFwiKEdlbiBcIiArIGN3X3RvcFNjb3Jlc1trXS5pICsgXCIpXCJcclxuXHJcbiAgICB0cy5pbm5lckhUTUwgKz0gIFtuLCBzY29yZSwgZGlzdGFuY2UsIHlyYW5nZSwgZ2VuXS5qb2luKFwiIFwiKSArIFwiPGJyIC8+XCI7XHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBkcmF3QWxsUmVzdWx0cyhzY2F0dGVyUGxvdEVsZW0sIGNvbmZpZywgYWxsUmVzdWx0cywgcHJldmlvdXNHcmFwaCl7XHJcbiAgaWYoIXNjYXR0ZXJQbG90RWxlbSkgcmV0dXJuO1xyXG4gIHJldHVybiBzY2F0dGVyUGxvdChzY2F0dGVyUGxvdEVsZW0sIGFsbFJlc3VsdHMsIGNvbmZpZy5wcm9wZXJ0eU1hcCwgcHJldmlvdXNHcmFwaClcclxufVxyXG4iLCIvKiBnbG9iYWxzIHZpcyBIaWdoY2hhcnRzICovXHJcblxyXG4vLyBDYWxsZWQgd2hlbiB0aGUgVmlzdWFsaXphdGlvbiBBUEkgaXMgbG9hZGVkLlxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBoaWdoQ2hhcnRzO1xyXG5mdW5jdGlvbiBoaWdoQ2hhcnRzKGVsZW0sIHNjb3Jlcyl7XHJcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhzY29yZXNbMF0uZGVmKTtcclxuICBrZXlzID0ga2V5cy5yZWR1Y2UoZnVuY3Rpb24oY3VyQXJyYXksIGtleSl7XHJcbiAgICB2YXIgbCA9IHNjb3Jlc1swXS5kZWZba2V5XS5sZW5ndGg7XHJcbiAgICB2YXIgc3ViQXJyYXkgPSBbXTtcclxuICAgIGZvcih2YXIgaSA9IDA7IGkgPCBsOyBpKyspe1xyXG4gICAgICBzdWJBcnJheS5wdXNoKGtleSArIFwiLlwiICsgaSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gY3VyQXJyYXkuY29uY2F0KHN1YkFycmF5KTtcclxuICB9LCBbXSk7XHJcbiAgZnVuY3Rpb24gcmV0cmlldmVWYWx1ZShvYmosIHBhdGgpe1xyXG4gICAgcmV0dXJuIHBhdGguc3BsaXQoXCIuXCIpLnJlZHVjZShmdW5jdGlvbihjdXJWYWx1ZSwga2V5KXtcclxuICAgICAgcmV0dXJuIGN1clZhbHVlW2tleV07XHJcbiAgICB9LCBvYmopO1xyXG4gIH1cclxuXHJcbiAgdmFyIGRhdGFPYmogPSBPYmplY3Qua2V5cyhzY29yZXMpLnJlZHVjZShmdW5jdGlvbihrdiwgc2NvcmUpe1xyXG4gICAga2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSl7XHJcbiAgICAgIGt2W2tleV0uZGF0YS5wdXNoKFtcclxuICAgICAgICByZXRyaWV2ZVZhbHVlKHNjb3JlLmRlZiwga2V5KSwgc2NvcmUuc2NvcmUudlxyXG4gICAgICBdKVxyXG4gICAgfSlcclxuICAgIHJldHVybiBrdjtcclxuICB9LCBrZXlzLnJlZHVjZShmdW5jdGlvbihrdiwga2V5KXtcclxuICAgIGt2W2tleV0gPSB7XHJcbiAgICAgIG5hbWU6IGtleSxcclxuICAgICAgZGF0YTogW10sXHJcbiAgICB9XHJcbiAgICByZXR1cm4ga3Y7XHJcbiAgfSwge30pKVxyXG4gIEhpZ2hjaGFydHMuY2hhcnQoZWxlbS5pZCwge1xyXG4gICAgICBjaGFydDoge1xyXG4gICAgICAgICAgdHlwZTogJ3NjYXR0ZXInLFxyXG4gICAgICAgICAgem9vbVR5cGU6ICd4eSdcclxuICAgICAgfSxcclxuICAgICAgdGl0bGU6IHtcclxuICAgICAgICAgIHRleHQ6ICdQcm9wZXJ0eSBWYWx1ZSB0byBTY29yZSdcclxuICAgICAgfSxcclxuICAgICAgeEF4aXM6IHtcclxuICAgICAgICAgIHRpdGxlOiB7XHJcbiAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICAgICAgICB0ZXh0OiAnTm9ybWFsaXplZCdcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICBzdGFydE9uVGljazogdHJ1ZSxcclxuICAgICAgICAgIGVuZE9uVGljazogdHJ1ZSxcclxuICAgICAgICAgIHNob3dMYXN0TGFiZWw6IHRydWVcclxuICAgICAgfSxcclxuICAgICAgeUF4aXM6IHtcclxuICAgICAgICAgIHRpdGxlOiB7XHJcbiAgICAgICAgICAgICAgdGV4dDogJ1Njb3JlJ1xyXG4gICAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBsZWdlbmQ6IHtcclxuICAgICAgICAgIGxheW91dDogJ3ZlcnRpY2FsJyxcclxuICAgICAgICAgIGFsaWduOiAnbGVmdCcsXHJcbiAgICAgICAgICB2ZXJ0aWNhbEFsaWduOiAndG9wJyxcclxuICAgICAgICAgIHg6IDEwMCxcclxuICAgICAgICAgIHk6IDcwLFxyXG4gICAgICAgICAgZmxvYXRpbmc6IHRydWUsXHJcbiAgICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6IChIaWdoY2hhcnRzLnRoZW1lICYmIEhpZ2hjaGFydHMudGhlbWUubGVnZW5kQmFja2dyb3VuZENvbG9yKSB8fCAnI0ZGRkZGRicsXHJcbiAgICAgICAgICBib3JkZXJXaWR0aDogMVxyXG4gICAgICB9LFxyXG4gICAgICBwbG90T3B0aW9uczoge1xyXG4gICAgICAgICAgc2NhdHRlcjoge1xyXG4gICAgICAgICAgICAgIG1hcmtlcjoge1xyXG4gICAgICAgICAgICAgICAgICByYWRpdXM6IDUsXHJcbiAgICAgICAgICAgICAgICAgIHN0YXRlczoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgaG92ZXI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGxpbmVDb2xvcjogJ3JnYigxMDAsMTAwLDEwMCknXHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIHN0YXRlczoge1xyXG4gICAgICAgICAgICAgICAgICBob3Zlcjoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgbWFya2VyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZW5hYmxlZDogZmFsc2VcclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgdG9vbHRpcDoge1xyXG4gICAgICAgICAgICAgICAgICBoZWFkZXJGb3JtYXQ6ICc8Yj57c2VyaWVzLm5hbWV9PC9iPjxicj4nLFxyXG4gICAgICAgICAgICAgICAgICBwb2ludEZvcm1hdDogJ3twb2ludC54fSwge3BvaW50Lnl9J1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgfSxcclxuICAgICAgc2VyaWVzOiBrZXlzLm1hcChmdW5jdGlvbihrZXkpe1xyXG4gICAgICAgIHJldHVybiBkYXRhT2JqW2tleV07XHJcbiAgICAgIH0pXHJcbiAgfSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHZpc0NoYXJ0KGVsZW0sIHNjb3JlcywgcHJvcGVydHlNYXAsIGdyYXBoKSB7XHJcblxyXG4gIC8vIENyZWF0ZSBhbmQgcG9wdWxhdGUgYSBkYXRhIHRhYmxlLlxyXG4gIHZhciBkYXRhID0gbmV3IHZpcy5EYXRhU2V0KCk7XHJcbiAgc2NvcmVzLmZvckVhY2goZnVuY3Rpb24oc2NvcmVJbmZvKXtcclxuICAgIGRhdGEuYWRkKHtcclxuICAgICAgeDogZ2V0UHJvcGVydHkoc2NvcmVJbmZvLCBwcm9wZXJ0eU1hcC54KSxcclxuICAgICAgeTogZ2V0UHJvcGVydHkoc2NvcmVJbmZvLCBwcm9wZXJ0eU1hcC54KSxcclxuICAgICAgejogZ2V0UHJvcGVydHkoc2NvcmVJbmZvLCBwcm9wZXJ0eU1hcC56KSxcclxuICAgICAgc3R5bGU6IGdldFByb3BlcnR5KHNjb3JlSW5mbywgcHJvcGVydHlNYXAueiksXHJcbiAgICAgIC8vIGV4dHJhOiBkZWYuYW5jZXN0cnlcclxuICAgIH0pO1xyXG4gIH0pO1xyXG5cclxuICBmdW5jdGlvbiBnZXRQcm9wZXJ0eShpbmZvLCBrZXkpe1xyXG4gICAgaWYoa2V5ID09PSBcInNjb3JlXCIpe1xyXG4gICAgICByZXR1cm4gaW5mby5zY29yZS52XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICByZXR1cm4gaW5mby5kZWZba2V5XTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8vIHNwZWNpZnkgb3B0aW9uc1xyXG4gIHZhciBvcHRpb25zID0ge1xyXG4gICAgd2lkdGg6ICAnNjAwcHgnLFxyXG4gICAgaGVpZ2h0OiAnNjAwcHgnLFxyXG4gICAgc3R5bGU6ICdkb3Qtc2l6ZScsXHJcbiAgICBzaG93UGVyc3BlY3RpdmU6IHRydWUsXHJcbiAgICBzaG93TGVnZW5kOiB0cnVlLFxyXG4gICAgc2hvd0dyaWQ6IHRydWUsXHJcbiAgICBzaG93U2hhZG93OiBmYWxzZSxcclxuXHJcbiAgICAvLyBPcHRpb24gdG9vbHRpcCBjYW4gYmUgdHJ1ZSwgZmFsc2UsIG9yIGEgZnVuY3Rpb24gcmV0dXJuaW5nIGEgc3RyaW5nIHdpdGggSFRNTCBjb250ZW50c1xyXG4gICAgdG9vbHRpcDogZnVuY3Rpb24gKHBvaW50KSB7XHJcbiAgICAgIC8vIHBhcmFtZXRlciBwb2ludCBjb250YWlucyBwcm9wZXJ0aWVzIHgsIHksIHosIGFuZCBkYXRhXHJcbiAgICAgIC8vIGRhdGEgaXMgdGhlIG9yaWdpbmFsIG9iamVjdCBwYXNzZWQgdG8gdGhlIHBvaW50IGNvbnN0cnVjdG9yXHJcbiAgICAgIHJldHVybiAnc2NvcmU6IDxiPicgKyBwb2ludC56ICsgJzwvYj48YnI+JzsgLy8gKyBwb2ludC5kYXRhLmV4dHJhO1xyXG4gICAgfSxcclxuXHJcbiAgICAvLyBUb29sdGlwIGRlZmF1bHQgc3R5bGluZyBjYW4gYmUgb3ZlcnJpZGRlblxyXG4gICAgdG9vbHRpcFN0eWxlOiB7XHJcbiAgICAgIGNvbnRlbnQ6IHtcclxuICAgICAgICBiYWNrZ3JvdW5kICAgIDogJ3JnYmEoMjU1LCAyNTUsIDI1NSwgMC43KScsXHJcbiAgICAgICAgcGFkZGluZyAgICAgICA6ICcxMHB4JyxcclxuICAgICAgICBib3JkZXJSYWRpdXMgIDogJzEwcHgnXHJcbiAgICAgIH0sXHJcbiAgICAgIGxpbmU6IHtcclxuICAgICAgICBib3JkZXJMZWZ0ICAgIDogJzFweCBkb3R0ZWQgcmdiYSgwLCAwLCAwLCAwLjUpJ1xyXG4gICAgICB9LFxyXG4gICAgICBkb3Q6IHtcclxuICAgICAgICBib3JkZXIgICAgICAgIDogJzVweCBzb2xpZCByZ2JhKDAsIDAsIDAsIDAuNSknXHJcbiAgICAgIH1cclxuICAgIH0sXHJcblxyXG4gICAga2VlcEFzcGVjdFJhdGlvOiB0cnVlLFxyXG4gICAgdmVydGljYWxSYXRpbzogMC41XHJcbiAgfTtcclxuXHJcbiAgdmFyIGNhbWVyYSA9IGdyYXBoID8gZ3JhcGguZ2V0Q2FtZXJhUG9zaXRpb24oKSA6IG51bGw7XHJcblxyXG4gIC8vIGNyZWF0ZSBvdXIgZ3JhcGhcclxuICB2YXIgY29udGFpbmVyID0gZWxlbTtcclxuICBncmFwaCA9IG5ldyB2aXMuR3JhcGgzZChjb250YWluZXIsIGRhdGEsIG9wdGlvbnMpO1xyXG5cclxuICBpZiAoY2FtZXJhKSBncmFwaC5zZXRDYW1lcmFQb3NpdGlvbihjYW1lcmEpOyAvLyByZXN0b3JlIGNhbWVyYSBwb3NpdGlvblxyXG4gIHJldHVybiBncmFwaDtcclxufVxyXG4iLCJcclxubW9kdWxlLmV4cG9ydHMgPSBnZW5lcmF0ZVJhbmRvbTtcclxuZnVuY3Rpb24gZ2VuZXJhdGVSYW5kb20oKXtcclxuICByZXR1cm4gTWF0aC5yYW5kb20oKTtcclxufVxyXG4iLCIvLyBodHRwOi8vc3VubWluZ3Rhby5ibG9nc3BvdC5jb20vMjAxNi8xMS9pbmJyZWVkaW5nLWNvZWZmaWNpZW50Lmh0bWxcclxubW9kdWxlLmV4cG9ydHMgPSBnZXRJbmJyZWVkaW5nQ29lZmZpY2llbnQ7XHJcblxyXG5mdW5jdGlvbiBnZXRJbmJyZWVkaW5nQ29lZmZpY2llbnQoY2hpbGQpe1xyXG4gIHZhciBuYW1lSW5kZXggPSBuZXcgTWFwKCk7XHJcbiAgdmFyIGZsYWdnZWQgPSBuZXcgU2V0KCk7XHJcbiAgdmFyIGNvbnZlcmdlbmNlUG9pbnRzID0gbmV3IFNldCgpO1xyXG4gIGNyZWF0ZUFuY2VzdHJ5TWFwKGNoaWxkLCBbXSk7XHJcblxyXG4gIHZhciBzdG9yZWRDb2VmZmljaWVudHMgPSBuZXcgTWFwKCk7XHJcblxyXG4gIHJldHVybiBBcnJheS5mcm9tKGNvbnZlcmdlbmNlUG9pbnRzLnZhbHVlcygpKS5yZWR1Y2UoZnVuY3Rpb24oc3VtLCBwb2ludCl7XHJcbiAgICB2YXIgaUNvID0gZ2V0Q29lZmZpY2llbnQocG9pbnQpO1xyXG4gICAgcmV0dXJuIHN1bSArIGlDbztcclxuICB9LCAwKTtcclxuXHJcbiAgZnVuY3Rpb24gY3JlYXRlQW5jZXN0cnlNYXAoaW5pdE5vZGUpe1xyXG4gICAgdmFyIGl0ZW1zSW5RdWV1ZSA9IFt7IG5vZGU6IGluaXROb2RlLCBwYXRoOiBbXSB9XTtcclxuICAgIGRve1xyXG4gICAgICB2YXIgaXRlbSA9IGl0ZW1zSW5RdWV1ZS5zaGlmdCgpO1xyXG4gICAgICB2YXIgbm9kZSA9IGl0ZW0ubm9kZTtcclxuICAgICAgdmFyIHBhdGggPSBpdGVtLnBhdGg7XHJcbiAgICAgIGlmKHByb2Nlc3NJdGVtKG5vZGUsIHBhdGgpKXtcclxuICAgICAgICB2YXIgbmV4dFBhdGggPSBbIG5vZGUuaWQgXS5jb25jYXQocGF0aCk7XHJcbiAgICAgICAgaXRlbXNJblF1ZXVlID0gaXRlbXNJblF1ZXVlLmNvbmNhdChub2RlLmFuY2VzdHJ5Lm1hcChmdW5jdGlvbihwYXJlbnQpe1xyXG4gICAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgbm9kZTogcGFyZW50LFxyXG4gICAgICAgICAgICBwYXRoOiBuZXh0UGF0aFxyXG4gICAgICAgICAgfTtcclxuICAgICAgICB9KSk7XHJcbiAgICAgIH1cclxuICAgIH13aGlsZShpdGVtc0luUXVldWUubGVuZ3RoKTtcclxuXHJcblxyXG4gICAgZnVuY3Rpb24gcHJvY2Vzc0l0ZW0obm9kZSwgcGF0aCl7XHJcbiAgICAgIHZhciBuZXdBbmNlc3RvciA9ICFuYW1lSW5kZXguaGFzKG5vZGUuaWQpO1xyXG4gICAgICBpZihuZXdBbmNlc3Rvcil7XHJcbiAgICAgICAgbmFtZUluZGV4LnNldChub2RlLmlkLCB7XHJcbiAgICAgICAgICBwYXJlbnRzOiAobm9kZS5hbmNlc3RyeSB8fCBbXSkubWFwKGZ1bmN0aW9uKHBhcmVudCl7XHJcbiAgICAgICAgICAgIHJldHVybiBwYXJlbnQuaWQ7XHJcbiAgICAgICAgICB9KSxcclxuICAgICAgICAgIGlkOiBub2RlLmlkLFxyXG4gICAgICAgICAgY2hpbGRyZW46IFtdLFxyXG4gICAgICAgICAgY29udmVyZ2VuY2VzOiBbXSxcclxuICAgICAgICB9KTtcclxuICAgICAgfSBlbHNlIHtcclxuXHJcbiAgICAgICAgZmxhZ2dlZC5hZGQobm9kZS5pZClcclxuICAgICAgICBuYW1lSW5kZXguZ2V0KG5vZGUuaWQpLmNoaWxkcmVuLmZvckVhY2goZnVuY3Rpb24oY2hpbGRJZGVudGlmaWVyKXtcclxuICAgICAgICAgIHZhciBvZmZzZXRzID0gZmluZENvbnZlcmdlbmNlKGNoaWxkSWRlbnRpZmllci5wYXRoLCBwYXRoKTtcclxuICAgICAgICAgIGlmKCFvZmZzZXRzKXtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgdmFyIGNoaWxkSUQgPSBwYXRoW29mZnNldHNbMV1dO1xyXG4gICAgICAgICAgY29udmVyZ2VuY2VQb2ludHMuYWRkKGNoaWxkSUQpO1xyXG4gICAgICAgICAgbmFtZUluZGV4LmdldChjaGlsZElEKS5jb252ZXJnZW5jZXMucHVzaCh7XHJcbiAgICAgICAgICAgIHBhcmVudDogbm9kZS5pZCxcclxuICAgICAgICAgICAgb2Zmc2V0czogb2Zmc2V0cyxcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZihwYXRoLmxlbmd0aCl7XHJcbiAgICAgICAgbmFtZUluZGV4LmdldChub2RlLmlkKS5jaGlsZHJlbi5wdXNoKHtcclxuICAgICAgICAgIGNoaWxkOiBwYXRoWzBdLFxyXG4gICAgICAgICAgcGF0aDogcGF0aFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZighbmV3QW5jZXN0b3Ipe1xyXG4gICAgICAgIHJldHVybjtcclxuICAgICAgfVxyXG4gICAgICBpZighbm9kZS5hbmNlc3RyeSl7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gZ2V0Q29lZmZpY2llbnQoaWQpe1xyXG4gICAgaWYoc3RvcmVkQ29lZmZpY2llbnRzLmhhcyhpZCkpe1xyXG4gICAgICByZXR1cm4gc3RvcmVkQ29lZmZpY2llbnRzLmdldChpZCk7XHJcbiAgICB9XHJcbiAgICB2YXIgbm9kZSA9IG5hbWVJbmRleC5nZXQoaWQpO1xyXG4gICAgdmFyIHZhbCA9IG5vZGUuY29udmVyZ2VuY2VzLnJlZHVjZShmdW5jdGlvbihzdW0sIHBvaW50KXtcclxuICAgICAgcmV0dXJuIHN1bSArIE1hdGgucG93KDEgLyAyLCBwb2ludC5vZmZzZXRzLnJlZHVjZShmdW5jdGlvbihzdW0sIHZhbHVlKXtcclxuICAgICAgICByZXR1cm4gc3VtICsgdmFsdWU7XHJcbiAgICAgIH0sIDEpKSAqICgxICsgZ2V0Q29lZmZpY2llbnQocG9pbnQucGFyZW50KSk7XHJcbiAgICB9LCAwKTtcclxuICAgIHN0b3JlZENvZWZmaWNpZW50cy5zZXQoaWQsIHZhbCk7XHJcblxyXG4gICAgcmV0dXJuIHZhbDtcclxuXHJcbiAgfVxyXG4gIGZ1bmN0aW9uIGZpbmRDb252ZXJnZW5jZShsaXN0QSwgbGlzdEIpe1xyXG4gICAgdmFyIGNpLCBjaiwgbGksIGxqO1xyXG4gICAgb3V0ZXJsb29wOlxyXG4gICAgZm9yKGNpID0gMCwgbGkgPSBsaXN0QS5sZW5ndGg7IGNpIDwgbGk7IGNpKyspe1xyXG4gICAgICBmb3IoY2ogPSAwLCBsaiA9IGxpc3RCLmxlbmd0aDsgY2ogPCBsajsgY2orKyl7XHJcbiAgICAgICAgaWYobGlzdEFbY2ldID09PSBsaXN0Qltjal0pe1xyXG4gICAgICAgICAgYnJlYWsgb3V0ZXJsb29wO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG4gICAgaWYoY2kgPT09IGxpKXtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFtjaSwgY2pdO1xyXG4gIH1cclxufVxyXG4iLCJ2YXIgY2FyQ29uc3RydWN0ID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvY29uc3RydWN0LmpzXCIpO1xyXG5cclxudmFyIGNhckNvbnN0YW50cyA9IGNhckNvbnN0cnVjdC5jYXJDb25zdGFudHMoKTtcclxuXHJcbnZhciBzY2hlbWEgPSBjYXJDb25zdHJ1Y3QuZ2VuZXJhdGVTY2hlbWEoY2FyQ29uc3RhbnRzKTtcclxudmFyIHBpY2tQYXJlbnQgPSByZXF1aXJlKFwiLi9waWNrUGFyZW50XCIpO1xyXG52YXIgc2VsZWN0RnJvbUFsbFBhcmVudHMgPSByZXF1aXJlKFwiLi9zZWxlY3RGcm9tQWxsUGFyZW50c1wiKTtcclxuY29uc3QgY29uc3RhbnRzID0ge1xyXG4gIGdlbmVyYXRpb25TaXplOiAyMCxcclxuICBzY2hlbWE6IHNjaGVtYSxcclxuICBjaGFtcGlvbkxlbmd0aDogMSxcclxuICBtdXRhdGlvbl9yYW5nZTogMSxcclxuICBnZW5fbXV0YXRpb246IDAuMDUsXHJcbn07XHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oKXtcclxuICB2YXIgY3VycmVudENob2ljZXMgPSBuZXcgTWFwKCk7XHJcbiAgcmV0dXJuIE9iamVjdC5hc3NpZ24oXHJcbiAgICB7fSxcclxuICAgIGNvbnN0YW50cyxcclxuICAgIHtcclxuICAgICAgc2VsZWN0RnJvbUFsbFBhcmVudHM6IHNlbGVjdEZyb21BbGxQYXJlbnRzLFxyXG4gICAgICBnZW5lcmF0ZVJhbmRvbTogcmVxdWlyZShcIi4vZ2VuZXJhdGVSYW5kb21cIiksXHJcbiAgICAgIHBpY2tQYXJlbnQ6IHBpY2tQYXJlbnQuYmluZCh2b2lkIDAsIGN1cnJlbnRDaG9pY2VzKSxcclxuICAgIH1cclxuICApO1xyXG59XHJcbm1vZHVsZS5leHBvcnRzLmNvbnN0YW50cyA9IGNvbnN0YW50c1xyXG4iLCJ2YXIgbkF0dHJpYnV0ZXMgPSAxNTtcclxubW9kdWxlLmV4cG9ydHMgPSBwaWNrUGFyZW50O1xyXG5cclxuZnVuY3Rpb24gcGlja1BhcmVudChjdXJyZW50Q2hvaWNlcywgY2hvb3NlSWQsIGtleSAvKiAsIHBhcmVudHMgKi8pe1xyXG4gIGlmKCFjdXJyZW50Q2hvaWNlcy5oYXMoY2hvb3NlSWQpKXtcclxuICAgIGN1cnJlbnRDaG9pY2VzLnNldChjaG9vc2VJZCwgaW5pdGlhbGl6ZVBpY2soKSlcclxuICB9XHJcbiAgLy8gY29uc29sZS5sb2coY2hvb3NlSWQpO1xyXG4gIHZhciBzdGF0ZSA9IGN1cnJlbnRDaG9pY2VzLmdldChjaG9vc2VJZCk7XHJcbiAgLy8gY29uc29sZS5sb2coc3RhdGUuY3VycGFyZW50KTtcclxuICBzdGF0ZS5pKytcclxuICBpZihbXCJ3aGVlbF9yYWRpdXNcIiwgXCJ3aGVlbF92ZXJ0ZXhcIiwgXCJ3aGVlbF9kZW5zaXR5XCJdLmluZGV4T2Yoa2V5KSA+IC0xKXtcclxuICAgIHN0YXRlLmN1cnBhcmVudCA9IGN3X2Nob29zZVBhcmVudChzdGF0ZSk7XHJcbiAgICByZXR1cm4gc3RhdGUuY3VycGFyZW50O1xyXG4gIH1cclxuICBzdGF0ZS5jdXJwYXJlbnQgPSBjd19jaG9vc2VQYXJlbnQoc3RhdGUpO1xyXG4gIHJldHVybiBzdGF0ZS5jdXJwYXJlbnQ7XHJcblxyXG4gIGZ1bmN0aW9uIGN3X2Nob29zZVBhcmVudChzdGF0ZSkge1xyXG4gICAgdmFyIGN1cnBhcmVudCA9IHN0YXRlLmN1cnBhcmVudDtcclxuICAgIHZhciBhdHRyaWJ1dGVJbmRleCA9IHN0YXRlLmk7XHJcbiAgICB2YXIgc3dhcFBvaW50MSA9IHN0YXRlLnN3YXBQb2ludDFcclxuICAgIHZhciBzd2FwUG9pbnQyID0gc3RhdGUuc3dhcFBvaW50MlxyXG4gICAgLy8gY29uc29sZS5sb2coc3dhcFBvaW50MSwgc3dhcFBvaW50MiwgYXR0cmlidXRlSW5kZXgpXHJcbiAgICBpZiAoKHN3YXBQb2ludDEgPT0gYXR0cmlidXRlSW5kZXgpIHx8IChzd2FwUG9pbnQyID09IGF0dHJpYnV0ZUluZGV4KSkge1xyXG4gICAgICByZXR1cm4gY3VycGFyZW50ID09IDEgPyAwIDogMVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGN1cnBhcmVudFxyXG4gIH1cclxuXHJcbiAgZnVuY3Rpb24gaW5pdGlhbGl6ZVBpY2soKXtcclxuICAgIHZhciBjdXJwYXJlbnQgPSAwO1xyXG5cclxuICAgIHZhciBzd2FwUG9pbnQxID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG5BdHRyaWJ1dGVzKSk7XHJcbiAgICB2YXIgc3dhcFBvaW50MiA9IHN3YXBQb2ludDE7XHJcbiAgICB3aGlsZSAoc3dhcFBvaW50MiA9PSBzd2FwUG9pbnQxKSB7XHJcbiAgICAgIHN3YXBQb2ludDIgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobkF0dHJpYnV0ZXMpKTtcclxuICAgIH1cclxuICAgIHZhciBpID0gMDtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGN1cnBhcmVudDogY3VycGFyZW50LFxyXG4gICAgICBpOiBpLFxyXG4gICAgICBzd2FwUG9pbnQxOiBzd2FwUG9pbnQxLFxyXG4gICAgICBzd2FwUG9pbnQyOiBzd2FwUG9pbnQyXHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiIsInZhciBnZXRJbmJyZWVkaW5nQ29lZmZpY2llbnQgPSByZXF1aXJlKFwiLi9pbmJyZWVkaW5nLWNvZWZmaWNpZW50XCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBzaW1wbGVTZWxlY3Q7XHJcblxyXG5mdW5jdGlvbiBzaW1wbGVTZWxlY3QocGFyZW50cyl7XHJcbiAgdmFyIHRvdGFsUGFyZW50cyA9IHBhcmVudHMubGVuZ3RoXHJcbiAgdmFyIHIgPSBNYXRoLnJhbmRvbSgpO1xyXG4gIGlmIChyID09IDApXHJcbiAgICByZXR1cm4gMDtcclxuICByZXR1cm4gTWF0aC5mbG9vcigtTWF0aC5sb2cocikgKiB0b3RhbFBhcmVudHMpICUgdG90YWxQYXJlbnRzO1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZWxlY3RGcm9tQWxsUGFyZW50cyhwYXJlbnRzLCBwYXJlbnRMaXN0LCBwcmV2aW91c1BhcmVudEluZGV4KSB7XHJcbiAgdmFyIHByZXZpb3VzUGFyZW50ID0gcGFyZW50c1twcmV2aW91c1BhcmVudEluZGV4XTtcclxuICB2YXIgdmFsaWRQYXJlbnRzID0gcGFyZW50cy5maWx0ZXIoZnVuY3Rpb24ocGFyZW50LCBpKXtcclxuICAgIGlmKHByZXZpb3VzUGFyZW50SW5kZXggPT09IGkpe1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgICBpZighcHJldmlvdXNQYXJlbnQpe1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH1cclxuICAgIHZhciBjaGlsZCA9IHtcclxuICAgICAgaWQ6IE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMzIpLFxyXG4gICAgICBhbmNlc3RyeTogW3ByZXZpb3VzUGFyZW50LCBwYXJlbnRdLm1hcChmdW5jdGlvbihwKXtcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgaWQ6IHAuZGVmLmlkLFxyXG4gICAgICAgICAgYW5jZXN0cnk6IHAuZGVmLmFuY2VzdHJ5XHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gICAgdmFyIGlDbyA9IGdldEluYnJlZWRpbmdDb2VmZmljaWVudChjaGlsZCk7XHJcbiAgICBjb25zb2xlLmxvZyhcImluYnJlZWRpbmcgY29lZmZpY2llbnRcIiwgaUNvKVxyXG4gICAgaWYoaUNvID4gMC4yNSl7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHJldHVybiB0cnVlO1xyXG4gIH0pXHJcbiAgaWYodmFsaWRQYXJlbnRzLmxlbmd0aCA9PT0gMCl7XHJcbiAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogcGFyZW50cy5sZW5ndGgpXHJcbiAgfVxyXG4gIHZhciB0b3RhbFNjb3JlID0gdmFsaWRQYXJlbnRzLnJlZHVjZShmdW5jdGlvbihzdW0sIHBhcmVudCl7XHJcbiAgICByZXR1cm4gc3VtICsgcGFyZW50LnNjb3JlLnY7XHJcbiAgfSwgMCk7XHJcbiAgdmFyIHIgPSB0b3RhbFNjb3JlICogTWF0aC5yYW5kb20oKTtcclxuICBmb3IodmFyIGkgPSAwOyBpIDwgdmFsaWRQYXJlbnRzLmxlbmd0aDsgaSsrKXtcclxuICAgIHZhciBzY29yZSA9IHZhbGlkUGFyZW50c1tpXS5zY29yZS52O1xyXG4gICAgaWYociA+IHNjb3JlKXtcclxuICAgICAgciA9IHIgLSBzY29yZTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIGJyZWFrO1xyXG4gICAgfVxyXG4gIH1cclxuICByZXR1cm4gaTtcclxufVxyXG4iLCJ2YXIgcmFuZG9tID0gcmVxdWlyZShcIi4vcmFuZG9tLmpzXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgY3JlYXRlR2VuZXJhdGlvblplcm8oc2NoZW1hLCBnZW5lcmF0b3Ipe1xyXG4gICAgcmV0dXJuIE9iamVjdC5rZXlzKHNjaGVtYSkucmVkdWNlKGZ1bmN0aW9uKGluc3RhbmNlLCBrZXkpe1xyXG4gICAgICB2YXIgc2NoZW1hUHJvcCA9IHNjaGVtYVtrZXldO1xyXG4gICAgICB2YXIgdmFsdWVzID0gcmFuZG9tLmNyZWF0ZU5vcm1hbHMoc2NoZW1hUHJvcCwgZ2VuZXJhdG9yKTtcclxuICAgICAgaW5zdGFuY2Vba2V5XSA9IHZhbHVlcztcclxuICAgICAgcmV0dXJuIGluc3RhbmNlO1xyXG4gICAgfSwgeyBpZDogTWF0aC5yYW5kb20oKS50b1N0cmluZygzMikgfSk7XHJcbiAgfSxcclxuICBjcmVhdGVDcm9zc0JyZWVkKHNjaGVtYSwgcGFyZW50cywgcGFyZW50Q2hvb3Nlcil7XHJcbiAgICB2YXIgaWQgPSBNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDMyKTtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihjcm9zc0RlZiwga2V5KXtcclxuICAgICAgdmFyIHNjaGVtYURlZiA9IHNjaGVtYVtrZXldO1xyXG4gICAgICB2YXIgdmFsdWVzID0gW107XHJcbiAgICAgIGZvcih2YXIgaSA9IDAsIGwgPSBzY2hlbWFEZWYubGVuZ3RoOyBpIDwgbDsgaSsrKXtcclxuICAgICAgICB2YXIgcCA9IHBhcmVudENob29zZXIoaWQsIGtleSwgcGFyZW50cyk7XHJcbiAgICAgICAgdmFsdWVzLnB1c2gocGFyZW50c1twXVtrZXldW2ldKTtcclxuICAgICAgfVxyXG4gICAgICBjcm9zc0RlZltrZXldID0gdmFsdWVzO1xyXG4gICAgICByZXR1cm4gY3Jvc3NEZWY7XHJcbiAgICB9LCB7XHJcbiAgICAgIGlkOiBpZCxcclxuICAgICAgYW5jZXN0cnk6IHBhcmVudHMubWFwKGZ1bmN0aW9uKHBhcmVudCl7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIGlkOiBwYXJlbnQuaWQsXHJcbiAgICAgICAgICBhbmNlc3RyeTogcGFyZW50LmFuY2VzdHJ5LFxyXG4gICAgICAgIH07XHJcbiAgICAgIH0pXHJcbiAgICB9KTtcclxuICB9LFxyXG4gIGNyZWF0ZU11dGF0ZWRDbG9uZShzY2hlbWEsIGdlbmVyYXRvciwgcGFyZW50LCBmYWN0b3IsIGNoYW5jZVRvTXV0YXRlKXtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihjbG9uZSwga2V5KXtcclxuICAgICAgdmFyIHNjaGVtYVByb3AgPSBzY2hlbWFba2V5XTtcclxuICAgICAgdmFyIG9yaWdpbmFsVmFsdWVzID0gcGFyZW50W2tleV07XHJcbiAgICAgIHZhciB2YWx1ZXMgPSByYW5kb20ubXV0YXRlTm9ybWFscyhcclxuICAgICAgICBzY2hlbWFQcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBmYWN0b3IsIGNoYW5jZVRvTXV0YXRlXHJcbiAgICAgICk7XHJcbiAgICAgIGNsb25lW2tleV0gPSB2YWx1ZXM7XHJcbiAgICAgIHJldHVybiBjbG9uZTtcclxuICAgIH0sIHtcclxuICAgICAgaWQ6IHBhcmVudC5pZCxcclxuICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeVxyXG4gICAgfSk7XHJcbiAgfSxcclxuICBhcHBseVR5cGVzKHNjaGVtYSwgcGFyZW50KXtcclxuICAgIHJldHVybiBPYmplY3Qua2V5cyhzY2hlbWEpLnJlZHVjZShmdW5jdGlvbihjbG9uZSwga2V5KXtcclxuICAgICAgdmFyIHNjaGVtYVByb3AgPSBzY2hlbWFba2V5XTtcclxuICAgICAgdmFyIG9yaWdpbmFsVmFsdWVzID0gcGFyZW50W2tleV07XHJcbiAgICAgIHZhciB2YWx1ZXM7XHJcbiAgICAgIHN3aXRjaChzY2hlbWFQcm9wLnR5cGUpe1xyXG4gICAgICAgIGNhc2UgXCJzaHVmZmxlXCIgOlxyXG4gICAgICAgICAgdmFsdWVzID0gcmFuZG9tLm1hcFRvU2h1ZmZsZShzY2hlbWFQcm9wLCBvcmlnaW5hbFZhbHVlcyk7IGJyZWFrO1xyXG4gICAgICAgIGNhc2UgXCJmbG9hdFwiIDpcclxuICAgICAgICAgIHZhbHVlcyA9IHJhbmRvbS5tYXBUb0Zsb2F0KHNjaGVtYVByb3AsIG9yaWdpbmFsVmFsdWVzKTsgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBcImludGVnZXJcIjpcclxuICAgICAgICAgIHZhbHVlcyA9IHJhbmRvbS5tYXBUb0ludGVnZXIoc2NoZW1hUHJvcCwgb3JpZ2luYWxWYWx1ZXMpOyBicmVhaztcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIHR5cGUgJHtzY2hlbWFQcm9wLnR5cGV9IG9mIHNjaGVtYSBmb3Iga2V5ICR7a2V5fWApO1xyXG4gICAgICB9XHJcbiAgICAgIGNsb25lW2tleV0gPSB2YWx1ZXM7XHJcbiAgICAgIHJldHVybiBjbG9uZTtcclxuICAgIH0sIHtcclxuICAgICAgaWQ6IHBhcmVudC5pZCxcclxuICAgICAgYW5jZXN0cnk6IHBhcmVudC5hbmNlc3RyeVxyXG4gICAgfSk7XHJcbiAgfSxcclxufVxyXG4iLCJtb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRjcmVhdGVEYXRhUG9pbnRDbHVzdGVyOiBjcmVhdGVEYXRhUG9pbnRDbHVzdGVyLFxyXG5cdGNyZWF0ZURhdGFQb2ludDogY3JlYXRlRGF0YVBvaW50LFxyXG5cdGNyZWF0ZUNsdXN0ZXJJbnRlcmZhY2U6IGNyZWF0ZUNsdXN0ZXJJbnRlcmZhY2UsXHJcblx0ZmluZERhdGFQb2ludENsdXN0ZXI6IGZpbmREYXRhUG9pbnRDbHVzdGVyLFxyXG5cdGZpbmREYXRhUG9pbnQ6IGZpbmREYXRhUG9pbnQsXHJcblx0c29ydENsdXN0ZXI6IHNvcnRDbHVzdGVyLFxyXG5cdGZpbmRPamVjdE5laWdoYm9yczogZmluZE9qZWN0TmVpZ2hib3JzLFxyXG5cdHNjb3JlT2JqZWN0OiBzY29yZU9iamVjdCxcclxuXHRjcmVhdGVTdWJEYXRhUG9pbnRDbHVzdGVyOmNyZWF0ZVN1YkRhdGFQb2ludENsdXN0ZXJcclxuXHRcclxufVxyXG5cclxuZnVuY3Rpb24gY3JlYXRlRGF0YVBvaW50Q2x1c3RlcihjYXJEYXRhUG9pbnRUeXBlKXtcclxuXHR2YXIgY2x1c3RlciA9IHtcclxuXHRcdGlkOiBjYXJEYXRhUG9pbnRUeXBlLFxyXG5cdFx0ZGF0YUFycmF5OiBuZXcgQXJyYXkoKVxyXG5cdH07XHJcblx0cmV0dXJuIGNsdXN0ZXI7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZVN1YkRhdGFQb2ludENsdXN0ZXIoY2FyRGF0YVBvaW50VHlwZSl7XHJcblx0dmFyIGNsdXN0ZXIgPSB7XHJcblx0XHRpZDogY2FyRGF0YVBvaW50VHlwZSxcclxuXHRcdGRhdGFBcnJheTogbmV3IEFycmF5KClcclxuXHR9O1xyXG5cdHJldHVybiBjbHVzdGVyO1xyXG59XHJcblxyXG5mdW5jdGlvbiBjcmVhdGVEYXRhUG9pbnQoZGF0YUlkLCBkYXRhUG9pbnRUeXBlLCBkLCBzKXtcclxuXHR2YXIgZGF0YVBvaW50ID0ge1xyXG5cdFx0aWQ6IGRhdGFJZCxcclxuXHRcdHR5cGU6IGRhdGFQb2ludFR5cGUsXHJcblx0XHRkYXRhOiBkLFxyXG5cdFx0c2NvcmU6IHNcclxuXHR9O1xyXG5cdHJldHVybiBkYXRhUG9pbnQ7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZUNsdXN0ZXJJbnRlcmZhY2UoaWQpe1xyXG5cdHZhciBjbHVzdGVyID0ge1xyXG5cdFx0Y2Fyc0FycmF5OiBuZXcgQXJyYXkoKSxcclxuXHRcdGNsdXN0ZXJJRDogaWQsXHJcblx0XHRhcnJheU9mQ2x1c3RlcnM6IG5ldyBBcnJheSgpXHJcblx0fTtcclxuXHRyZXR1cm4gY2x1c3RlcjtcclxufVxyXG5cclxuZnVuY3Rpb24gc29ydENsdXN0ZXIoY2x1c3Rlcil7XHJcblx0Y2x1c3Rlci5zb3J0KGZ1bmN0aW9uKGEsIGIpe3JldHVybiBhLmRhdGEgLSBiLmRhdGF9KTtcclxufVxyXG5cclxuZnVuY3Rpb24gZmluZE9qZWN0TmVpZ2hib3JzKGRhdGFJZCwgY2x1c3RlciwgcmFuZ2UpIHtcclxuXHR2YXIgbmVpZ2hib3JzID0gbmV3IEFycmF5KCk7XHJcblx0dmFyIGluZGV4ID0gY2x1c3Rlci5maW5kSW5kZXgoeD0+IHguaWQ9PT1kYXRhSWQpO1xyXG5cdHZhciBnb25lUGFzdElkID0gZmFsc2U7XHJcblx0dmFyIGNsdXN0ZXJMZW5ndGggPSBjbHVzdGVyLmxlbmd0aDtcclxuXHRmb3IodmFyIGk9MDtpPHJhbmdlO2krKyl7XHJcblx0XHRpZigoaW5kZXgtcmFuZ2UpPDApe1xyXG5cdFx0XHRpZihjbHVzdGVyW2ldLmlkPT09ZGF0YUlkKXtnb25lUGFzdElkPXRydWU7fVxyXG5cdFx0XHRuZWlnaGJvcnMucHVzaCgoZ29uZVBhc3RJZD09PWZhbHNlKT9jbHVzdGVyW2ldOmNsdXN0ZXJbaSsxXSk7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKChpbmRleCtyYW5nZSk+Y2x1c3Rlckxlbmd0aCl7XHJcblx0XHRcdGlmKGNsdXN0ZXJbKGNsdXN0ZXJMZW5ndGgtMSktaV0uaWQ9PT1kYXRhSWQpe2dvbmVQYXN0SWQ9dHJ1ZTt9XHJcblx0XHRcdG5laWdoYm9ycy5wdXNoKChnb25lUGFzdElkPT09ZmFsc2UpP2NsdXN0ZXJbKGNsdXN0ZXJMZW5ndGgtMSktaV06Y2x1c3RlclsoY2x1c3Rlckxlbmd0aC0xKS0oaSsxKV0pO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSB7XHJcblx0XHRcdGlmKGNsdXN0ZXJbaW5kZXgtKHJhbmdlLzIpK2ldLmlkPT09ZGF0YUlkKXtnb25lUGFzdElkPXRydWU7fVxyXG5cdFx0XHRuZWlnaGJvcnMucHVzaCgoZ29uZVBhc3RJZD09PWZhbHNlKT9jbHVzdGVyW2luZGV4LShyYW5nZS8yKStpXTpjbHVzdGVyWyhpbmRleCsxKS0ocmFuZ2UvMikraV0pO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0fVxyXG5cdHJldHVybiBuZWlnaGJvcnM7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGZpbmREYXRhUG9pbnRDbHVzdGVyKGRhdGFJZCwgY2x1c3Rlcil7XHJcblx0cmV0dXJuIGNsdXN0ZXIuYXJyYXlPZkNsdXN0ZXJzLmZpbmQoeD0+IHguaWQ9PT1kYXRhSWQpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBmaW5kRGF0YVBvaW50KGRhdGFJZCwgY2x1c3Rlcil7XHJcblx0cmV0dXJuIGNsdXN0ZXIuZGF0YUFycmF5LmZpbmQoZnVuY3Rpb24odmFsdWUpe1xyXG5cdFx0cmV0dXJuIHZhbHVlLmlkPT09aWQ7XHJcblx0fSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIHNjb3JlT2JqZWN0KGlkLCBjbHVzdGVyKXtcclxuXHR2YXIgbmVpZ2hib3JzID0gZmluZE9qZWN0TmVpZ2hib3JzKGlkLCBjbHVzdGVyLCAoKGNsdXN0ZXIubGVuZ3RoLzQpPDQwKT82OjQwKTtcclxuXHR2YXIgbmV3U2NvcmUgPSAwO1xyXG5cdGZvcih2YXIgaT0wO2k8bmVpZ2hib3JzLmxlbmd0aDtpKyspe1xyXG5cdFx0bmV3U2NvcmUrPW5laWdoYm9yc1tpXS5zY29yZTtcclxuXHR9XHJcblx0cmV0dXJuIG5ld1Njb3JlL25laWdoYm9ycy5sZW5ndGg7XHJcbn0iLCJ2YXIgY2x1c3RlciA9IHJlcXVpcmUoXCIuL2NsdXN0ZXIuanMvXCIpO1xyXG4vL3ZhciBjYXJPYmplY3RzID0gcmVxdWlyZShcIi4vY2FyLW9iamVjdHMuanNvblwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0ge1xyXG5cdHNldHVwOiBzZXR1cCxcclxuXHRyZVNjb3JlQ2FyczogcmVTY29yZUNhcnNcclxufVxyXG5cclxuLy9cIndoZWVsX3JhZGl1c1wiLCBcImNoYXNzaXNfZGVuc2l0eVwiLCBcInZlcnRleF9saXN0XCIsIFwid2hlZWxfdmVydGV4XCIgYW5kIFwid2hlZWxfZGVuc2l0eVwiL1xyXG5mdW5jdGlvbiBzZXR1cChjYXJzLCBleHRDbHVzdGVyLCBjbHVzdGVyUHJlY3JlYXRlZCl7XHJcblx0dmFyIGNsdXN0ID0gKGNsdXN0ZXJQcmVjcmVhdGVkPT09ZmFsc2UpP3NldHVwRGF0YUNsdXN0ZXJzKGNsdXN0ZXIuY3JlYXRlQ2x1c3RlckludGVyZmFjZShcIm5ld0NsdXN0ZXJcIikpOiBleHRDbHVzdGVyO1xyXG5cdGZvcih2YXIgaSA9MDtpPGNhcnMubGVuZ3RoO2krKyl7XHJcblx0XHRpZihjYXJzW2ldLmRlZi5lbGl0ZT09PWZhbHNlKXtcclxuXHRcdFx0YWRkQ2Fyc1RvQ2x1c3RlcihjYXJzW2ldLCBjbHVzdCk7XHJcblx0XHRcdGNsdXN0LmNhcnNBcnJheS5wdXNoKGNhcnNbaV0pO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRjb25zb2xlLmxvZyhjbHVzdCk7Ly90ZXN0XHJcblx0cmV0dXJuIGNsdXN0O1xyXG59XHJcblxyXG5mdW5jdGlvbiBzZXR1cERhdGFDbHVzdGVycyhtYWluQ2x1c3Rlcil7XHJcblx0bWFpbkNsdXN0ZXIuYXJyYXlPZkNsdXN0ZXJzLnB1c2goY2x1c3Rlci5jcmVhdGVEYXRhUG9pbnRDbHVzdGVyKFwid2hlZWxfcmFkaXVzXCIpKTtcclxuXHRtYWluQ2x1c3Rlci5hcnJheU9mQ2x1c3RlcnMucHVzaChjbHVzdGVyLmNyZWF0ZURhdGFQb2ludENsdXN0ZXIoXCJjaGFzc2lzX2RlbnNpdHlcIikpO1xyXG5cdG1haW5DbHVzdGVyLmFycmF5T2ZDbHVzdGVycy5wdXNoKGNsdXN0ZXIuY3JlYXRlRGF0YVBvaW50Q2x1c3RlcihcIndoZWVsX3ZlcnRleFwiKSk7XHJcblx0bWFpbkNsdXN0ZXIuYXJyYXlPZkNsdXN0ZXJzLnB1c2goY2x1c3Rlci5jcmVhdGVEYXRhUG9pbnRDbHVzdGVyKFwidmVydGV4X2xpc3RcIikpO1xyXG5cdG1haW5DbHVzdGVyLmFycmF5T2ZDbHVzdGVycy5wdXNoKGNsdXN0ZXIuY3JlYXRlRGF0YVBvaW50Q2x1c3RlcihcIndoZWVsX2RlbnNpdHlcIikpO1xyXG5cdHJldHVybiBtYWluQ2x1c3RlcjtcclxufVxyXG5cclxuZnVuY3Rpb24gYWRkQ2Fyc1RvQ2x1c3RlcihjYXIsIGNsdXN0KXtcclxuXHRhZGREYXRhVG9DbHVzdGVyKGNhci5kZWYuaWQsIGNhci5kZWYud2hlZWxfcmFkaXVzLGNhci5zY29yZS5zLCBjbHVzdGVyLmZpbmREYXRhUG9pbnRDbHVzdGVyKFwid2hlZWxfcmFkaXVzXCIsIGNsdXN0KSk7XHJcbiAgICBhZGREYXRhVG9DbHVzdGVyKGNhci5kZWYuaWQsIGNhci5kZWYuY2hhc3Npc19kZW5zaXR5LGNhci5zY29yZS5zLCBjbHVzdGVyLmZpbmREYXRhUG9pbnRDbHVzdGVyKFwiY2hhc3Npc19kZW5zaXR5XCIsIGNsdXN0KSk7XHJcblx0YWRkRGF0YVRvQ2x1c3RlcihjYXIuZGVmLmlkLCBjYXIuZGVmLnZlcnRleF9saXN0LGNhci5zY29yZS5zLCBjbHVzdGVyLmZpbmREYXRhUG9pbnRDbHVzdGVyKFwidmVydGV4X2xpc3RcIiwgY2x1c3QpKTtcclxuXHRhZGREYXRhVG9DbHVzdGVyKGNhci5kZWYuaWQsIGNhci5kZWYud2hlZWxfdmVydGV4LGNhci5zY29yZS5zLCBjbHVzdGVyLmZpbmREYXRhUG9pbnRDbHVzdGVyKFwid2hlZWxfdmVydGV4XCIsIGNsdXN0KSk7XHJcblx0YWRkRGF0YVRvQ2x1c3RlcihjYXIuZGVmLmlkLCBjYXIuZGVmLndoZWVsX2RlbnNpdHksY2FyLnNjb3JlLnMsIGNsdXN0ZXIuZmluZERhdGFQb2ludENsdXN0ZXIoXCJ3aGVlbF9kZW5zaXR5XCIsIGNsdXN0KSk7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGFkZERhdGFUb0NsdXN0ZXIoaWQsIGNhckRhdGEsIHNjb3JlLCBjbHVzdCl7XHJcblx0aWYoY2x1c3QuZGF0YUFycmF5Lmxlbmd0aD09PWNhckRhdGEubGVuZ3RoKXtcclxuXHRcdGZvcih2YXIgeD0wO3g8Y2FyRGF0YS5sZW5ndGg7eCsrKXtcclxuXHRcdFx0Y2x1c3QuZGF0YUFycmF5W3hdLmRhdGFBcnJheS5wdXNoKGNsdXN0ZXIuY3JlYXRlRGF0YVBvaW50KGlkLCBcIlwiLCBjYXJEYXRhW3hdLCBzY29yZSkpO1xyXG5cdFx0XHRjbHVzdGVyLnNvcnRDbHVzdGVyKGNsdXN0LmRhdGFBcnJheVt4XS5kYXRhQXJyYXkpO1xyXG5cdFx0fVxyXG5cdH1cclxuXHRlbHNlIHtcclxuXHRcdGZvcih2YXIgaT0wO2k8Y2FyRGF0YS5sZW5ndGg7aSsrKXtcclxuXHRcdFx0dmFyIG5ld0NsdXN0ID0gY2x1c3Rlci5jcmVhdGVTdWJEYXRhUG9pbnRDbHVzdGVyKFwiXCIpO1xyXG5cdFx0XHRuZXdDbHVzdC5kYXRhQXJyYXkucHVzaChjbHVzdGVyLmNyZWF0ZURhdGFQb2ludChpZCwgXCJcIiwgY2FyRGF0YVtpXSwgc2NvcmUpKTtcclxuXHRcdFx0Y2x1c3QuZGF0YUFycmF5LnB1c2gobmV3Q2x1c3QpO1xyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuZnVuY3Rpb24gcmVTY29yZUNhcnMoY2FycywgY2x1c3Qpe1xyXG5cdGZvcih2YXIgaT0wO2k8Y2Fycy5sZW5ndGg7aSsrKXtcclxuXHRcdHZhciBzY29yZSA9IDA7XHJcblx0XHRmb3IodmFyIHg9MDt4PGNsdXN0LmFycmF5T2ZDbHVzdGVycy5sZW5ndGg7eCsrKXtcclxuXHRcdFx0Zm9yKHZhciB5PTA7eTxjbHVzdC5hcnJheU9mQ2x1c3RlcnNbeF0uZGF0YUFycmF5Lmxlbmd0aDt5Kyspe1xyXG5cdFx0XHRcdHNjb3JlICs9IGNsdXN0ZXIuc2NvcmVPYmplY3QoY2Fyc1tpXS5kZWYuaWQsIGNsdXN0LmFycmF5T2ZDbHVzdGVyc1t4XS5kYXRhQXJyYXlbeV0uZGF0YUFycmF5KTtcclxuXHRcdFx0fVxyXG5cdFx0fVxyXG5cdFx0Y2Fyc1tpXS5zY29yZS5zICs9IHNjb3JlL2NsdXN0LmFycmF5T2ZDbHVzdGVycy5sZW5ndGg7XHJcblx0fVxyXG59XHJcblxyXG5mdW5jdGlvbiBjbHVzdGVyTXV0YXRlKGlkLCBjbHVzdCl7XHJcblx0dmFyIG5laWdoYm9ycyA9IGNsdXN0ZXIuZmluZE9qZWN0TmVpZ2hib3JzKGlkLCBjbHVzdGVyLCAoKGNsdXN0Lmxlbmd0aC80KTw0MCk/Njo0MCk7XHJcblx0bmVpZ2hib3JzLnNvcnQoZnVuY3Rpb24oYSwgYil7cmV0dXJuIGIuc2NvcmUucyAtIGEuc2NvcmUuczt9KTtcclxuXHRyZXR1cm4gbmVpZ2hib3JzWzBdLmRhdGE7XHJcbn1cclxuXHJcbiIsIi8qdmFyIHJhbmRvbUludCA9IHJlcXVpcmUoXCIuL3JhbmRvbUludC5qcy9cIik7XHJcbnZhciBnZXRSYW5kb21JbnQgPSByYW5kb21JbnQuZ2V0UmFuZG9tSW50OyovXHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRydW5Dcm9zc292ZXI6IHJ1bkNyb3Nzb3ZlclxyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gY3JlYXRlcyB0aGUgYWN1YWwgbmV3IGNhciBhbmQgcmV0dXJuZWQuIFRoZSBmdW5jdGlvbiBydW5zIGEgb25lLXBvaW50IGNyb3Nzb3ZlciB0YWtpbmcgZGF0YSBmcm9tIHRoZSBwYXJlbnRzIHBhc3NlZCB0aHJvdWdoIGFuZCBhZGRpbmcgdGhlbSB0byB0aGUgbmV3IGNhci5cclxuQHBhcmFtIHBhcmVudHMgT2JqZWN0QXJyYXkgLSBEYXRhIGlzIHRha2VuIGZyb20gdGhlc2UgY2FycyBhbmQgYWRkZWQgdG8gdGhlIG5ldyBjYXIgdXNpbmcgY3Jvc3NvdmVyLlxyXG5AcGFyYW0gc2NoZW1hIC0gVGhlIGRhdGEgb2JqZWN0cyB0aGF0IGNhciBvYmplY3RzIGhhdmUgc3VjaCBhcyBcIndoZWVsX3JhZGl1c1wiLCBcImNoYXNzaXNfZGVuc2l0eVwiLCBcInZlcnRleF9saXN0XCIsIFwid2hlZWxfdmVydGV4XCIgYW5kIFwid2hlZWxfZGVuc2l0eVwiXHJcbkBwYXJhbSBub0Nyb3Nzb3ZlclBvaW50IGludCAtIFRoZSBmaXJzdCBjcm9zc292ZXIgcG9pbnQgcmFuZG9tbHkgZ2VuZXJhdGVkXHJcbkBwYXJhbSBub0Nyb3Nzb3ZlclBvaW50VHdvIGludCAtIFRoZSBzZWNvbmQgY3Jvc3NvdmVyIHBvaW50IHJhbmRvbWx5IGdlbmVyYXRlZCBcclxuQHBhcmFtIGNhck5vIGludCAtIHdoZXRoZXIgdGhpcyBjYXIgaXMgdGhlIGZpcnN0IG9yIHNlY29uZCBjaGlsZCBmb3IgdGhlIHBhcmVudCBjYXJzXHJcbkBwYXJhbSBwYXJlbnRTY29yZSBpbnQgLSBUaGUgYXZlcmFnZSBzY29yZSBvZiB0aGUgdHdvIHBhcmVudHNcclxuQHBhcmFtIG5vQ2Fyc0NyZWF0ZWQgaW50IC0gVGhlIG51bWJlciBvZiBjYXJzIGNyZWF0ZWQgc28gZmFyLCB1c2VkIGZvciB0aGUgbmV3IGNhcnMgaWRcclxuQHBhcmFtIGNyb3Nzb3ZlclR5cGUgaW50IC0gVGhlIHR5cGUgb2YgY3Jvc3NvdmVyIHRvIHVzZSBzdWNoIGFzIDEgZm9yIE9uZSBwb2ludCBjcm9zc292ZXIgYW55IG90aGVyIFR3byBwb2ludCBjcm9zc292ZXJcclxuQHJldHVybiBjYXIgT2JqZWN0IC0gQSBjYXIgb2JqZWN0IGlzIGNyZWF0ZWQgYW5kIHJldHVybmVkKi9cclxuZnVuY3Rpb24gY29tYmluZURhdGEocGFyZW50cywgc2NoZW1hLCBub0Nyb3Nzb3ZlclBvaW50LCBub0Nyb3Nzb3ZlclBvaW50VHdvLCBjYXJObywgcGFyZW50U2NvcmUsbm9DYXJzQ3JlYXRlZCwgY3Jvc3NvdmVyVHlwZSl7XHJcblx0dmFyIGlkID0gbm9DYXJzQ3JlYXRlZCtjYXJObztcclxuXHR2YXIga2V5SXRlcmF0aW9uID0gMDtcclxuXHRyZXR1cm4gT2JqZWN0LmtleXMoc2NoZW1hKS5yZWR1Y2UoZnVuY3Rpb24oY3Jvc3NEZWYsIGtleSl7XHJcbiAgICAgIHZhciBzY2hlbWFEZWYgPSBzY2hlbWFba2V5XTtcclxuICAgICAgdmFyIHZhbHVlcyA9IFtdO1xyXG4gICAgICBmb3IodmFyIGkgPSAwLCBsID0gc2NoZW1hRGVmLmxlbmd0aDsgaSA8IGw7IGkrKyl7XHJcbiAgICAgICAgdmFyIHAgPSBjcm9zc292ZXIoY2FyTm8sIG5vQ3Jvc3NvdmVyUG9pbnQsIG5vQ3Jvc3NvdmVyUG9pbnRUd28sIGtleUl0ZXJhdGlvbiwgY3Jvc3NvdmVyVHlwZSk7XHJcbiAgICAgICAgdmFsdWVzLnB1c2gocGFyZW50c1twXVtrZXldW2ldKTtcclxuICAgICAgfVxyXG4gICAgICBjcm9zc0RlZltrZXldID0gdmFsdWVzO1xyXG5cdCAga2V5SXRlcmF0aW9uKys7XHJcbiAgICAgIHJldHVybiBjcm9zc0RlZjtcclxuICAgIH0gLCB7XHJcblx0XHRpZDogaWQsXHJcblx0XHRwYXJlbnRzU2NvcmU6IHBhcmVudFNjb3JlXHJcblx0fSk7XHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiBjaG9vc2VzIHdoaWNoIGNhciB0aGUgZGF0YSBpcyB0YWtlbiBmcm9tIGJhc2VkIG9uIHRoZSBwYXJhbWV0ZXJzIGdpdmVuIHRvIHRoZSBmdW5jdGlvblxyXG5AcGFyYW0gY2FyTm8gaW50IC0gVGhpcyBpcyB0aGUgbnVtYmVyIG9mIHRoZSBjYXIgYmVpbmcgY3JlYXRlZCBiZXR3ZWVuIDEtMiwgZmlsdGVycyBjYXJzIGRhdGEgaXMgYmVpbmcgdGFrZW5cclxuQHBhcmFtIG5vQ3Jvc3NvdmVyUG9pbnQgaW50IC0gVGhlIGZpcnN0IGNyb3Nzb3ZlciBwb2ludCB3aGVyZSBkYXRhIGJlZm9yZSBvciBhZnRlciB0aGUgcG9pbnQgaXMgdGFrZW5cclxuQHBhcmFtIG5vQ3Jvc3NvdmVyUG9pbnRUd28gaW50IC0gVGhlIHNlY29uZCBjcm9zc292ZXIgcG9pbnQgd2hlcmUgZGF0YSBpcyBiZWZvcmUgb3IgYWZ0ZXIgdGhlIHBvaW50IGlzIHRha2VuXHJcbkBwYXJhbSBrZXlJdGVyYXRpb24gaW50IC0gVGhpcyBpcyB0aGUgcG9pbnQgYXQgd2hpY2ggdGhlIGNyb3Nzb3ZlciBpcyBjdXJyZW50bHkgYXQgd2hpY2ggaGVscCBzcGVjaWZpZXMgd2hpY2ggY2FycyBkYXRhIGlzIHJlbGF2ZW50IHRvIHRha2UgY29tcGFyaW5nIHRoaXMgcG9pbnQgdG8gdGhlIG9uZS90d28gY3Jvc3NvdmUgcG9pbnRzXHJcbkBwYXJhbSBjcm9zc292ZVR5cGUgaW50IC0gVGhpcyBzcGVjaWZpZXMgaWYgb25lIHBvaW50KDEpIG9yIHR3byBwb2ludCBjcm9zc292ZXIoYW55IGludCkgaXMgdXNlZFxyXG5AcmV0dXJuIGludCAtIFdoaWNoIHBhcmVudCBkYXRhIHNob3VsZCBiZSB0YWtlbiBmcm9tIGlzIHJldHVybmVkIGVpdGhlciAwIG9yIDEqL1xyXG5mdW5jdGlvbiBjcm9zc292ZXIoY2FyTm8sIG5vQ3Jvc3NvdmVyUG9pbnQsIG5vQ3Jvc3NvdmVyUG9pbnRUd28sa2V5SXRlcmF0aW9uLGNyb3Nzb3ZlclR5cGUpe1xyXG5cdGlmKGNyb3Nzb3ZlclR5cGU9PT0xKXsgLy9ydW4gb25lLXBvaW50IGNyb3Nzb3ZlclxyXG5cdFx0cmV0dXJuIChjYXJObz09PTEpPyhrZXlJdGVyYXRpb24+PW5vQ3Jvc3NvdmVyUG9pbnQpPzA6MTooa2V5SXRlcmF0aW9uPj1ub0Nyb3Nzb3ZlclBvaW50KT8xOjA7Ly8gaGFuZGxlcyB0aGUgZml4ZWQgb25lLXBvaW50IHN3aXRjaCBvdmVyXHJcblx0fVxyXG5cdGVsc2UgeyAvL3J1biB0d28tcG9pbnQgY3Jvc3NvdmVyXHJcblx0XHRpZihjYXJObz09PTEpe1xyXG5cdFx0XHRpZigoKGtleUl0ZXJhdGlvbj5ub0Nyb3Nzb3ZlclBvaW50KSYmKGtleUl0ZXJhdGlvbjxub0Nyb3Nzb3ZlclBvaW50VHdvKSl8fCgoa2V5SXRlcmF0aW9uPm5vQ3Jvc3NvdmVyUG9pbnRUd28pJiYoa2V5SXRlcmF0aW9uPG5vQ3Jvc3NvdmVyUG9pbnQpKSl7XHJcblx0XHRcdFx0cmV0dXJuIDA7XHJcblx0XHRcdH1cclxuXHRcdFx0ZWxzZSB7IHJldHVybiAxO31cclxuXHRcdH1cclxuXHRcdGVsc2V7XHJcblx0XHRcdGlmKCgoa2V5SXRlcmF0aW9uPm5vQ3Jvc3NvdmVyUG9pbnQpJiYoa2V5SXRlcmF0aW9uPG5vQ3Jvc3NvdmVyUG9pbnRUd28pKXx8KChrZXlJdGVyYXRpb24+bm9Dcm9zc292ZXJQb2ludFR3bykmJihrZXlJdGVyYXRpb248bm9Dcm9zc292ZXJQb2ludCkpKXtcclxuXHRcdFx0XHRyZXR1cm4gMTtcclxuXHRcdFx0fVxyXG5cdFx0XHRlbHNlIHsgcmV0dXJuIDA7fVxyXG5cdFx0fVxyXG5cdH1cclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHJhbmRvbWx5IGdlbmVyYXRlcyB0d28gY3Jvc3NvdmVyIHBvaW50cyBhbmQgcGFzc2VzIHRoZW0gdG8gdGhlIGNyb3Nzb3ZlciBmdW5jdGlvblxyXG5AcGFyYW0gcGFyZW50cyBPYmplY3RBcnJheSAtIEFuIGFycmF5IG9mIHRoZSBwYXJlbnRzIG9iamVjdHNcclxuQHBhcmFtIGNyb3Nzb3ZlclRweWUgaW50IC0gU3BlY2lmaWVkIHdoaWNoIGNyb3Nzb3ZlciBzaG91bGQgYmUgdXNlZFxyXG5AcGFyYW0gc2NoZW1hIC0gQ2FyIG9iamVjdCBkYXRhIHRlbXBsYXRlIHVzZWQgZm9yIGNhciBjcmVhdGlvblxyXG5AcGFyYW0gcGFyZW50U2NvcmUgaW50IC0gQXZlcmFnZSBudW1iZXIgb2YgdGhlIHBhcmVudHMgc2NvcmVcclxuQHBhcmFtIG5vQ2Fyc0NyZWF0ZWQgaW50IC0gbnVtYmVyIG9mIGNhcnMgY3JlYXRlZCBmb3IgdGhlIHNpbXVsYXRpb25cclxuQHBhcmFtIG5vQ2Fyc1RvQ3JlYXRlIGludCAtIHRoZSBudW1iZXIgb2YgbmV3IGNhcnMgdGhhdCBzaG91bGQgYmUgY3JlYXRlZCB2aWEgY3Jvc3NvdmVyXHJcbkByZXR1cm4gY2FyIE9iamVjdEFycmF5IC0gQW4gYXJyYXkgb2YgbmV3bHkgY3JlYXRlZCBjYXJzIGZyb20gdGhlIGNyb3Nzb3ZlciBhcmUgcmV0dXJuZWQqL1xyXG5mdW5jdGlvbiBydW5Dcm9zc292ZXIocGFyZW50cyxjcm9zc292ZXJUeXBlLHNjaGVtYSwgcGFyZW50c1Njb3JlLG5vQ2Fyc0NyZWF0ZWQsIG5vQ2Fyc1RvQ3JlYXRlKXtcclxuXHR2YXIgbmV3Q2FycyA9IG5ldyBBcnJheSgpO1xyXG5cdHZhciBjcm9zc292ZXJQb2ludE9uZT1nZXRSYW5kb21JbnQoMCw0LCBuZXcgQXJyYXkoKSk7XHJcblx0dmFyIGNyb3Nzb3ZlclBvaW50VHdvPWdldFJhbmRvbUludCgwLDQsIFtjcm9zc292ZXJQb2ludE9uZV0pO1xyXG5cdGZvcih2YXIgaT0wO2k8bm9DYXJzVG9DcmVhdGU7aSsrKXtcclxuXHRcdG5ld0NhcnMucHVzaChjb21iaW5lRGF0YShwYXJlbnRzLHNjaGVtYSwgY3Jvc3NvdmVyUG9pbnRPbmUsIGNyb3Nzb3ZlclBvaW50VHdvLCBpLCBwYXJlbnRzU2NvcmUsbm9DYXJzQ3JlYXRlZCxjcm9zc292ZXJUeXBlKSk7XHJcblx0fVxyXG5cdHJldHVybiBuZXdDYXJzO1xyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gcmV0dXJucyB3aG9sZSBpbnRzIGJldHdlZW4gYSBtaW5pbXVtIGFuZCBtYXhpbXVtXHJcbkBwYXJhbSBtaW4gaW50IC0gVGhlIG1pbmltdW0gaW50IHRoYXQgY2FuIGJlIHJldHVybmVkXHJcbkBwYXJhbSBtYXggaW50IC0gVGhlIG1heGltdW0gaW50IHRoYXQgY2FuIGJlIHJldHVybmVkXHJcbkBwYXJhbSBub3RFcXVhbHNBcnIgaW50QXJyYXkgLSBBbiBhcnJheSBvZiB0aGUgaW50cyB0aGF0IHRoZSBmdW5jdGlvbiBzaG91bGQgbm90IHJldHVyblxyXG5AcmV0dXJuIGludCAtIFRoZSBpbnQgd2l0aGluIHRoZSBzcGVjaWZpZWQgcGFyYW1ldGVyIGJvdW5kcyBpcyByZXR1cm5lZC4qL1xyXG5mdW5jdGlvbiBnZXRSYW5kb21JbnQobWluLCBtYXgsIG5vdEVxdWFsc0Fycikge1xyXG5cdHZhciB0b1JldHVybjtcclxuXHR2YXIgcnVuTG9vcCA9IHRydWU7XHJcblx0d2hpbGUocnVuTG9vcD09PXRydWUpe1xyXG5cdFx0bWluID0gTWF0aC5jZWlsKG1pbik7XHJcblx0XHRtYXggPSBNYXRoLmZsb29yKG1heCk7XHJcblx0XHR0b1JldHVybiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChtYXggLSBtaW4gKyAxKSkgKyBtaW47XHJcblx0XHRpZih0eXBlb2Ygbm90RXF1YWxzQXJyID09PSBcInVuZGVmaW5lZFwiKXtcclxuXHRcdFx0cnVuTG9vcD1mYWxzZTtcclxuXHRcdH1cclxuXHRcdGVsc2UgaWYobm90RXF1YWxzQXJyLmZpbmQoZnVuY3Rpb24odmFsdWUpe3JldHVybiB2YWx1ZT09PXRvUmV0dXJuO30pIT09dG9SZXR1cm4pe1xyXG5cdFx0XHRydW5Mb29wPWZhbHNlO1xyXG5cdFx0fVxyXG5cdH1cclxuICAgIHJldHVybiB0b1JldHVybjsvLyh0eXBlb2YgZmluZElmRXhpc3RzID09PSBcInVuZGVmaW5lZFwiKT90b1JldHVybjpnZXRSYW5kb21JbnQobWluLCBtYXgsIG5vdEVxdWFsc0Fycik7XHJcbn1cclxuIiwibW9kdWxlLmV4cG9ydHM9e1wibmFtZVwiOlwib2JqZWN0c1wiLFwiYXJyYXlcIjpbe1wiaWRcIjpcIjAuaGRmNXFuN3ZybVwiLFwid2hlZWxfcmFkaXVzXCI6WzAuNTc2NzY5MDgyNDcyMTI0OCwwLjQxNzcyODYxNTQ0NzY4MzZdLFwid2hlZWxfZGVuc2l0eVwiOlswLjA1ODA1ODI4NDk5MzIyNzYzLDAuNTU1ODQ4NTAyOTIxODIxNl0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4wMTc0NjkyMjQ4MjgzMDYxNV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjc5NDE1NDYwMjc1MzE3OTQsMC4zMzg2MTA1ODMxMzQxODM0NiwwLjk4MTc5NjY3MjczNTA4ODYsMC4wNDA1ODM5MTg5OTAzOTQ3MSwwLjY3OTI3NjQ4NDAwODQ1NzcsMC43MDk1NTE2ODMzNDI5ODY5LDAuNDQ0MjkyOTY4OTc4NjAzNywwLjM3MTU5NzA5NjMzOTc4MTQ0LDAuNDg2NTU0OTEzODk4MDczMTUsMC44MTk0ODk3NDM0Njc5OTQ5LDAuMDY3OTEyOTI3NjI5MjIyNTIsMC44NTAwNjE3MTg3OTgxMjAxXSxcIndoZWVsX3ZlcnRleFwiOlswLjMxOTc0NTQ4MzM4MDQ4MDUsMC4wNzMwNjgzMjU1MzQ0MzUzMiwwLjk2OTY2ODAyMjEzMjE5MTgsMC4yODI0MjkxNDQ2Mjg4Njg1LDAuMjM4MDEwODQzNTM1NjI2MywwLjAzNDIwMTYzNjUyODUwMDA2LDAuMzkzMDIwNDQ3ODQ5NDAxNSwwLjkyOTI1ODkwMjYxNjg2MDVdLFwiaW5kZXhcIjowfSx7XCJpZFwiOlwiMC5kZHZxbzljNHU1XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4wNzYyNzMxMTY1MzY5MDMwNSwwLjM4MDc3NTY1ODI0NzA2MzgzXSxcIndoZWVsX2RlbnNpdHlcIjpbMC4wMTg2MzY5Nzg4MTA4NjQ2OCwwLjAyNjg2NDM2MTc4OTMxMDI4N10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC43MDQ1NTY4NTk2OTY5ODE4XSxcInZlcnRleF9saXN0XCI6WzAuODgyNzgzNjczODQ1MTQxMywwLjQxOTA2MTc0OTM0OTk5ODQsMC4wMTcxNDc2MjY4NDQ0MTcwNjMsMC4yMjc3NTUzNTM0NTI1MjAzLDAuOTM5MTg1MjMwMDU2MjM5MSwwLjQxNjIzNTM1MDQ3NDc5OTc2LDAuNjY3ODc0Mjk2NjU1NDIzLDAuMzE4NDkzNjA5Mjk4NDIyMywwLjg4NTYwMTc5MjI2MzIxNCwwLjEzNDY1Mzk4MTE2MjM5NjgsMC4zMjIzODUzMDM4NzI0ODgsMC4xNjE0MDc0NzIzOTY5MDFdLFwid2hlZWxfdmVydGV4XCI6WzAuMTcyMDY2MjUxNjcxODI1NDMsMC4yODY0MzA2Mjc3NTAyMDYyLDAuOTM4NTEzODg1OTM4OTYxNywwLjcxMjA1MTYzNDY3ODk3MDMsMC40NzY4MTg0MTc3NjMwMTIxNSwwLjk1NzM0MjAwNTczNzE2MTUsMC4zNDc3OTY1NzYwMzQxOTA1NiwwLjQ5NDI0MjgwMDEzNjk1MDFdLFwiaW5kZXhcIjoxfSx7XCJpZFwiOlwiMC5pNThlaWN1b2dwXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC44Nzk3NzQyMjAyNzkzNjkyLDAuNDk0NjA5MDA0MTcwMTY2M10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNjkwNzcxNTcwMDIzOTU2MywwLjM1NDMyOTg0OTkzNTYxNTU2XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjk5NzEwOTc2MzkzNTg1OTddLFwidmVydGV4X2xpc3RcIjpbMC4zMzU1OTM5NzY2Nzk1Njg2LDAuMzY3NzAzNTYxNjEyMDk5NiwwLjI1MjIxMDE3NDA4MTMxNDc0LDAuNjA0MjEzNTcxODE2NDM1LDAuMTQzMDMwMzY5NzY1MTc0NywwLjY3MDc0MTQ1Mzg1MDEzNDQsMC43OTc2NDEwNzkwNTg1Nzk3LDAuMDAzMzA0MDE5MzE1NzU4Mjk5OCwwLjQ4MjI1ODY0NTAwNTMwMDM2LDAuOTcyMjQ2MzQ5MDczOTg2MywwLjEzMzI2Njg1MTkwNjE4ODE0LDAuMjQ1MTE4NjM2ODE4NjMyNjZdLFwid2hlZWxfdmVydGV4XCI6WzAuOTEzNDYzMjU3Njc2MzM1NSwwLjgwMjg1NTcxNzkyMzEzNTMsMC4wNjUyMDg4NzYwMjAwMjY0NSwwLjUwMDg3ODQ4NDE3NTM0MTgsMC4yOTY2MDgyMjk2NDkyOTczNCwwLjgyNjg4NDc5NzA0OTkzMzMsMC43MDM1MTA3NzI2NzY4Nzc5LDAuMDIwMTQ5MTU2NzIwMzExMTQ1XSxcImluZGV4XCI6Mn0se1wiaWRcIjpcIjAuZ3V0ajc2YTg4ZlwiLFwid2hlZWxfcmFkaXVzXCI6WzAuOTI5MzIyOTE3OTgyMTk4NSwwLjE0MDk2MDE4ODA2NDI5NzIyXSxcIndoZWVsX2RlbnNpdHlcIjpbMC45NjEwNjY4NzQxNzg0NDUyLDAuMTI5MTg5MzUwNDU1NDQ2MjJdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNDQxMjkzODYxMjc3NDc3M10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjUwOTY2NjI4NTM5MDEyNywwLjA0NDA0MjQ3MDM3MTg4MzgsMC4zMjM1NTUxNDYxNTQ4MTA5NiwwLjUwMjg1NjA0OTE0Njc4MzcsMC44ODU1NTI1NjExODQ2ODg2LDAuNjYzNDc0NzYzMzkwODgxNywwLjA1MzcyMDEzNTQ3OTcyNTIwNiwwLjAzOTM5OTE5MTEzNDczNTc4LDAuODY1OTEzMDQ3OTk4ODAzMywwLjUyOTI2MTAxOTExNTU3OTMsMC4yNTg0NDk3NDQxMTczMzk0NSwwLjE1Njc0OTUzNTkzMzA1ODYzXSxcIndoZWVsX3ZlcnRleFwiOlswLjEwOTIyNTI5Nzk4NTQ2NzU0LDAuODY5NzY3MDc1MDQ2MTI2OCwwLjgzMDgwNzk0NTk4NzczMTMsMC42MzgzMTAyNzY2MTk3NTI4LDAuNzA5OTk2OTg1ODA5NjI5NiwwLjUzODk1MDk3NDUxMTE0MjMsMC44OTc4Mzc2MzMxOTYxMTI5LDAuNjQyMDY2NDUwMTA4NTg4NF0sXCJpbmRleFwiOjN9LHtcImlkXCI6XCIwLnMwcWI4Z2QxdWs4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC43MjE5ODY1OTQxMDUwMDAzLDAuODc0OTIyODc2NDg5ODYyN10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuODg4ODgyNzMxOTczNDQ2NywwLjM2MzM3ODA5NzIyODQ4MTddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNzgxMTUxNDM0MTc4ODk3Ml0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjA3MTAyOTgyNTE5MDIyMjYsMC4wNDc3NzgzOTkyMTc2MDc5NiwwLjEzMjU4ODgzODg5OTM4MDU2LDAuOTc2NjY0NzY3MzMwNjg1NiwwLjU0MDAzOTkzMzY3MjU3MDcsMC4wMDk0OTAzMDMyNzE1ODE4NDYsMC42MTA1NjE4MzQ1MjkzNjAyLDAuMzA3Njk2ODQwNjQ2Mjg5NDQsMC45NTM2ODIyMTMwMzYxMzc1LDAuNjYwODk2MDk4MTU3Mzg3MywwLjM4Nzg4NzY2ODQxMjM1MzU2LDAuMTQ2OTgyMTEyNzM1MTUxMTZdLFwid2hlZWxfdmVydGV4XCI6WzAuNDU3OTYwNTUzOTgxMTk3MDYsMC41MDgyMzg0MDA1Mzg3OTE0LDAuNjkxMDA3MDYzNzMzOTUyNywwLjQ5NDkxNDgwNTc2MTk1MDU3LDAuMDE3NTY0OTgzMDU2NjY5NTM2LDAuOTAwNDE4NzEyMTkzOTIzNiwwLjk1MDg4ODE0OTQ0Mzc3OCwwLjMxNDU3NzE4Nzk5ODMxMzldLFwiaW5kZXhcIjo0fSx7XCJpZFwiOlwiMC5hbTUwc2tmaWZ2OFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuNDM3MTc4MjE1MTcwNTAxNywwLjE2OTM0NDA3NTI4NjY5NTkzXSxcIndoZWVsX2RlbnNpdHlcIjpbMC41MTU1NjE1NTMwMzgyNDQ1LDAuMzc0NjM5ODYyNjU1ODQ4N10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC45Nzc3ODMxMDEwMzk4NTc5XSxcInZlcnRleF9saXN0XCI6WzAuNDIxODI1NDMzMjkxODQwMywwLjEzNDAyOTkxOTc5Nzk4NTk1LDAuNTY3OTUyMzgzMzgwNDI2MSwwLjk5ODYzNjA0NTQ3MTIxMzEsMC4xMzcwMjI2NTI5MDQ5NzE0LDAuNjg2NjIyNjcyMzk5NDMwOSwwLjIxMDg1MDY2NzIyODU4MTQ4LDAuMTEyMDEyODEwMzYzNDc4NTQsMC42NDU4ODY4MDgzODk2MjQzLDAuNzY4NjM0OTE3OTE5MjU5NSwwLjU2MzEyNzk0MTA4MzMwNzcsMC44OTI5NTI3ODcwMjc3Mzk0XSxcIndoZWVsX3ZlcnRleFwiOlswLjMyMDEzMDA0NjMzOTMxMDIsMC43ODgxMzA0Nzg1Mjk3NjY5LDAuMTk5NDYyMjY2Mzg3MDk1MywwLjUzNjEzMTI0NzA3OTA1MjIsMC45MzcyODQ0NzA0MzI3MDc3LDAuNjAyOTU2NjEwOTIwNzkzMSwwLjY2NTQ5NTk5MjAzOTE4MjEsMC4yNTQ0MDc1NjA3OTIwOTE3XSxcImluZGV4XCI6NX0se1wiaWRcIjpcIjAubWpjZzlmZW1hbmdcIixcIndoZWVsX3JhZGl1c1wiOlswLjYwNzUyODYxNzg5OTYzMzUsMC4wMjg5MzIzNTA4NzgyOTk5M10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNjg4MTE3MTA4OTIwNTU0OSwwLjM2ODEzNjkwMzA1MTc3NjI3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjkxOTQ3NDM2Njc5NDc5MzFdLFwidmVydGV4X2xpc3RcIjpbMC45MDQ1NjY2OTA4MTMyODgxLDAuMDMxNzAxNDQ5MzA0NzgwMjUsMC4zMzM4NDEzMDAyMTM3NDA2LDAuNzg0ODE3MDM4NTQwODI2NiwwLjg4MzI0MDc3NzIyNDI4MTYsMC44MjY1MzM0NzE4NzY5MTQ0LDAuOTYyOTY5NTUzMTI0NDIyOSwwLjI3MzYwNDE0MDIwOTIxOTEsMC44MDg4MDg3NDQ5NzYzODAxLDAuNDEwNzYxMDczMTI3OTQ1NjMsMC44MjE3OTk2NjMzNjc5NzA1LDAuMTQ4MzcwMjM2NTIzMTczNl0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4xMTQ4MDc4MTc0MzUxMzEwMiwwLjE2OTczNjg5OTQ5NzcxNzMsMC4yMjk4NjQxNTkyMjA1NDUyNiwwLjk1MTE1MzY1NDYzNzUzNTcsMC43ODA5MjMxMjkyMzkxNDUsMC43OTEwMjY4Mzg5NjYzODI4LDAuMzQ1NjEwMzQ2NDc3NjI3NywwLjk2MTM4NTk3NzY1Mjc5MDddLFwiaW5kZXhcIjo2fSx7XCJpZFwiOlwiMC5pZGZqdmU2Zjh0OFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuNTQxMTU1OTU4MTQ5NTE3MywwLjQ0MTI1MDUzMDQ4MDg5MDQ3XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4yNTkwOTg3NTQ5MjgyNjI4NCwwLjQ3MDIxMzk5MDY5NDU2MzI3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjM2MTM3MjgyMDIyODUwMTZdLFwidmVydGV4X2xpc3RcIjpbMC40MTAyMTM5MTU0NDI2OTMxNCwwLjk4ODE5MzI5Njk3Njk1ODksMC40OTg0NzExNDg1OTU1NDg4NiwwLjM3MzE5NzY4NzY4ODA1OTgzLDAuMDA1MDAyNTEzNDc3OTI5OTA0LDAuNDg5OTM5OTQ1NTA3Mzc2NzQsMC45NjcyNzU2ODI0MDExNjgxLDAuNjEwOTI3MTE3MzkyNywwLjY2OTgwMTQ3NTEyMzg4NzIsMC45OTczNjkwMjgwOTUwMDY3LDAuMTk0NDM2MzI4Njk0NDYyMTUsMC4wNDc2NTg0NzA1NTA0NTQxMzVdLFwid2hlZWxfdmVydGV4XCI6WzAuMjg2NDI3MDc0NDgwNTQ4NiwwLjE5MDQwMDgzODA2MTEyODYyLDAuNzcxOTU0NzYxODIwNzY3NiwwLjMxMzA2ODgwMjM5OTI0MjMsMC41NTI5OTE2MzY0MjU5MjAyLDAuOTEzMzQzNDgwODM3NjYxOSwwLjQ3MTE1MjkwNjIyNjY4ODYsMC44ODcxMzYwMjQ4MjEwMzk4XSxcImluZGV4XCI6N30se1wiaWRcIjpcIjAuOWtldjdlZWZwM1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuMjk4MzE1MjczMDQ4NTgxNjMsMC43NTQ0ODk1NzE2MDg3NjA1XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4xOTgxODc3OTg4MzU2Njg0LDAuNzAxNzQwNzEyMzIyNzM1NV0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4xMjY5ODAwMjExOTcyMzYwNl0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjkxODkyODMyNDM2NDQyMjgsMC42NzExNDE2Mzc4NjczMDI1LDAuNTA3OTQxOTI4OTc5OTM1NCwwLjYxODEwMzY0ODQyNDQyNDQsMC45NDc5Njk1NjYyMjM5NDExLDAuMjY5NzMzNTM5Mzg5NTYzNDYsMC43NzU2NTEzNTg4OTIyOTgsMC44NzU2MTY5MjMzMjkzOTA3LDAuMDU3NzI2MDI2Nzg4MTE1NjcsMC4yNTU0OTUwNzczNjkyODY4LDAuNzM5ODY0MTYzODEwNjIwMywwLjcxMTY4Njc2NDAwMzc0NzRdLFwid2hlZWxfdmVydGV4XCI6WzAuMTMyMTEwODgyMzkyMTMxNTMsMC4wMjcwNDI0NjQ2MDMzNzYwMDQsMC4wMDI3MDQ2MDIyNDg0ODI2NzkzLDAuOTE4ODkwODQxMjA0NzEyOCwwLjEyNzM0OTM3MzMwMzQ2Njk2LDAuNjMxMjQwOTEzOTc4NTc4NiwwLjU0NTgzNjExNDM0ODM3NzIsMC40MjAyNzgwMTIzMDM3NzA4XSxcImluZGV4XCI6OH0se1wiaWRcIjpcIjAuOTRvdjFpdnZkMWdcIixcIndoZWVsX3JhZGl1c1wiOlswLjQyMTc0NTQ4NjU1Njg1NDYsMC4xNDkzMDQ2Mjg2NzczNzc2XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4xNTc4MDAxNDUzOTc4NTc0NywwLjYzNDkzODc5MDkxMDM5MDddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMjYxMTAxNTA4MjAyMjA4MV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjE2MTQwNTYxOTgxMTUwNjgsMC43MDczMzg1MzA4ODMxNDgxLDAuODg2NTc3NTIwNDA1OTkyNSwwLjM4NTkyOTU5NTcyMjY4MTgsMC4wMDYzMjM3NDE0OTA3MjI5MDEsMC41NjAwNzE3MTYwMzM4MjIyLDAuNzE1MDgyODU4NDM0NDQwNCwwLjQ2NDU0NTE1NTM0ODM3NTI2LDAuMDg3ODcxMTY5MDcxNTY3MjIsMC43NDgyNzI2NDI0MzgxMzgzLDAuNjAwNzMzNDA3OTE5MTg2OCwwLjMxMjcxMTg3MTAzMjI4ODddLFwid2hlZWxfdmVydGV4XCI6WzAuMjQzNjIyODM1NzgxMTEzMiwwLjg3NzA5OTAzNjczODg0ODMsMC41NTYzMzI0NTE4NTM4Mzk1LDAuMjE1ODAwNTc4NTY5MTg3LDAuNzk0Nzc0MTkzNjY3OTUzMSwwLjc0NTMxNDcyOTQ3NDI2MDQsMC43MzI2NjU1MDUwMTA0OTUxLDAuODEyNTQzMzc0NzA3MzcwOV0sXCJpbmRleFwiOjl9LHtcImlkXCI6XCIwLmV1djNjaGZjb2dcIixcIndoZWVsX3JhZGl1c1wiOlswLjUwNjE4MDE5MjU5MDkwOCwwLjQwNzQzMDEyNDgwMjMyNzFdLFwid2hlZWxfZGVuc2l0eVwiOlswLjIyODE5Mzg3MDg4NTI2NzU1LDAuMjAzODg0MDc5OTc5NzAwODJdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuOTg2ODA5ODQ5OTgyOTczOF0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjg5MDExMDQ5MTYyMjE3OTQsMC4wMzgyNDYwNTM2MjM4NDI3LDAuMDEyNDc2MjE3NzUxODkwNDUsMC4zMTk4MjM5Mzc1MzkwMDA0LDAuMjQ2MTQyNjE3MDI1ODQxMTcsMC42NjEyMTQyMDU2MTA4OTUsMC4yMDg4Nzg2MTQwNzE3OTM3NiwwLjMwNzI0NDI3MjM1MjM0ODc1LDAuNjkwNjQ3Nzk5MzIxOTQ3MSwwLjEzNDIwMzI4MjYxMDQ1MjQ1LDAuNTU2MjA1NzY2MzkyNTA2NCwwLjU2MzY5MTIzMzYwNjA3MTNdLFwid2hlZWxfdmVydGV4XCI6WzAuMjcyOTI5NDAzMTU4Mjc5ODUsMC44MTE2Njk0ODExMDQ5OTk0LDAuMzQzMDU0MjcwODEyNjc2MjUsMC43Mzc3OTAzNzA5MjYzOTgsMC43MTQ0MDQ5NjMyMDUxOTc2LDAuNDEzNjU1MzQ5MjgyMjk1NCwwLjkwNjU3ODg2NTA2Njk0ODYsMC4yNjczNDM2Njg0MjIwNDY3XSxcImluZGV4XCI6MTB9LHtcImlkXCI6XCIwLjN0NzNyMDg5ODc4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4zMzQzNDc3ODIzNjA4MTg5NywwLjMzMTEwNzUwMDQ0NzI4OTJdLFwid2hlZWxfZGVuc2l0eVwiOlswLjE0ODI2NTEwODg3NzUyMDY1LDAuNzQ4NzQwMDU3NzAxODY5XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjA5Njg2OTY0Nzc4MDU5NTQ4XSxcInZlcnRleF9saXN0XCI6WzAuMTczNDUxODkwOTczMzU4LDAuOTU0OTU3ODUzNTA0NDg2LDAuMTI5NjkwMTIzODg2MzkzNjcsMC44MDkzNDQwMDQ5NTc5NzU5LDAuMjA2NjIxNzAyMjM2MzMyMzYsMC41OTU3NDc1NDk0MzA4MzY5LDAuMTIwOTMwOTM2NDQ2Mjc2NzMsMC4yMzgyNzY3ODUxNTQwNjQxNCwwLjg3ODIzNjk3NzE1NTA1OTEsMC4xODc5Mzk3MjQ0MDkwMjE3NCwwLjUzNDAyNDk4NDQ2MTI3NzQsMC42NzQ2OTM2MjU1ODk2NDIzXSxcIndoZWVsX3ZlcnRleFwiOlswLjc3Mzc0NTI4Mjg1NjU1MjgsMC4yMTc5NzMyNzA0MjIzMTIzLDAuNjQzMzkyNjEyNjkzMzIyNywwLjA1NTk3Mzk5MTI4ODYzMjEyLDAuODM2NDkwOTIwMTAyODA4MSwwLjU1OTQyNjYzNjg1NDA4ODgsMC40ODAyNjg5MjY3MTczNjM2NSwwLjEzMjg2MzM4NTQ0NzQ1OTAxXSxcImluZGV4XCI6MTF9LHtcImlkXCI6XCIwLm90cDRtaGdmZmxnXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4zMDk2NzIzODkwODk5MDc2LDAuMzI3MDkwNTg0NTg2MjUzNV0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuOTUxOTc5Nzc3OTQ3MDY1OCwwLjQ4MjQ2NTkxMjc5NDg2OTRdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNTA4ODQ5NTEzOTcxNjM0XSxcInZlcnRleF9saXN0XCI6WzAuMDUzODUwNzY4MDQ4MjEwMzIsMC40NzI0NjE1NzY5NzU0NTcyLDAuNDc1OTE4NzYwNzU3MTk5MywwLjg0MDQzOTIxMDM5MDQ2OTQsMC42MDY4MDM5MTg0MDU2OTg2LDAuMjQ1MDYwMzc5NTc2MjQ1MTYsMC43ODkwNTgzNTkxMDk3MjE4LDAuNDI4MDcyNzM0ODI4NTAxNCwwLjkxNDMwODM5OTgxNDc0MywwLjAxNjY3OTI0NTc4NjM1MDQ5NCwwLjAyMzU5NzM2NTkyMjc5NDE1NiwwLjU0NzIxNTA0NzgyOTY1MjVdLFwid2hlZWxfdmVydGV4XCI6WzAuOTY4MTMyNTQ3MTA4NjkyMywwLjg0NDA1OTI4MDQ4MzI0MzYsMC41NjMzMDQzODg3NTcyOTUzLDAuMzg2NTk5OTcxOTA1NzMxMTQsMC45NDU3MjU2OTc2ODAyMDczLDAuMTU2ODk1OTU3NDY4Mzg0MzYsMC41NDU5OTAzMjgxMDYzNDQzLDAuNjgzNDc2NjYwMTY0MzM0MV0sXCJpbmRleFwiOjEyfSx7XCJpZFwiOlwiMC5tNzJjbThnbGNpXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC40OTIxMTkwMjA1NzAyNTU3LDAuOTczMDEyMzEyMjE4NzQ0OF0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNjEzODczMTEwNzYyMjI3MSwwLjgwMTg4ODI2MDc0MDc3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjI3MzM2MzY2MjIxMjY1NDk2XSxcInZlcnRleF9saXN0XCI6WzAuNDg2NzMzNzkzNzEzNDc3MjUsMC41NjE2NjM5NDIxMTg2ODA5LDAuNjY1MjYyODY3NTQ1MzczMywwLjUyMTEyNzg2OTQ4MzA5NSwwLjg4MjYyMzY2ODAyODM3MTQsMC43NzI0MzcwMTU5NjcxOTYzLDAuNTMyODU0MzY0MzAxNDg3NCwwLjQ4Mjg5OTQ1Mzk1MDMxOTc1LDAuNzAxMTEyODkzOTk4NTg0NSwwLjk0MDc5MTkzNzQ5NTkxMzMsMC41MTk2NzU4MDE2MjY4MTQ0LDAuMjYyMTQ2MDc3MzI2MjI1NjNdLFwid2hlZWxfdmVydGV4XCI6WzAuMDI2OTY4MDM3MTM1MjI4NzczLDAuODA3ODExNTA5MDQ2ODc3OCwwLjExNTY3ODcxNjk0OTk4MDQ0LDAuMjg4NzY1MzE1MjIxMDQ4MSwwLjEwODcxNjM2MTY5NzM1NjU0LDAuMjkwMDU4MzEwMzg0MTU2OTcsMC45NzA1MjA4Mjg1ODU2Mzk1LDAuODUyMTY5OTYzMjc2MjMwNV0sXCJpbmRleFwiOjEzfSx7XCJpZFwiOlwiMC45aGp1cTB2YXJrOFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuNzM3Nzc0MjI3MjQyNDYwNiwwLjI3NzY2NDE5NzExNTM5MDE0XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4xMjA2Nzk4MjI4ODM4MDk3NCwwLjU1MDg0Mjk0Nzc0OTc4MDNdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNDc0Mjc3NzMwNzE5MTI3N10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjQ3NTMyNTczODUwOTYxNSwwLjY1MzQ2MjY5NjI2ODE4NiwwLjIzNjI0NDUyMTg1MDU5OTUyLDAuODYyNDc3MzI5NTMzNjI3OSwwLjM4NDM2NjMwNTM1Njc3MjUsMC4yOTYyNDE2Mzg3NjM2MTY2NCwwLjg1NTU4NjQwMjgwNjAzNjMsMC42MTUzNzk3NzEyNjIxNDA1LDAuMDIyOTA5MzEzMzA4Nzc3NjU3LDAuNzA3ODA3MzgxOTQwNTM3MywwLjI5OTU2MDMyMzMwMjM4NDcsMC45NTkxNTk5ODU1Mzk5MTkxXSxcIndoZWVsX3ZlcnRleFwiOlswLjkxNTkxNDYyNjkxMzI1OSwwLjY5NTY4NDQ2OTIwNzk4NzgsMC4zMzI4NDY5MTk2MzE3NjQwNSwwLjc5MTk5ODUxOTM2MzA4OTIsMC44ODQ2OTk2NDgzODI2MDc3LDAuNzg2MjYwNjQzMzUxNTU2NywwLjY1MjMzMjU3NjM4OTUwOTgsMC44MDE2MTA5NDIwNzY4NDA3XSxcImluZGV4XCI6MTR9LHtcImlkXCI6XCIwLnBrNHVxcm80MXVcIixcIndoZWVsX3JhZGl1c1wiOlswLjg2NTg4ODEwMDc4MDMxNjUsMC4zMzU3MzMxOTg2Mzk4NDczXSxcIndoZWVsX2RlbnNpdHlcIjpbMC41NjkyMDY0NTU3MzA3MzI0LDAuMjc5MTQ1NDg3MTAxMTU2M10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4zMTIwMzc1NDAwMzY3MDg2XSxcInZlcnRleF9saXN0XCI6WzAuOTE4OTU1NDAwOTk5MjUyNCwwLjM1NDI1NzkxMDA0Nzg0NjksMC4xNDk2NDgyNjk2MzQ0NzE2NCwwLjk1NDg5OTIwMzgxMDk0NDcsMC41MTM2OTgxODQ3OTU4MDMxLDAuNTQyNTQyMjIzMzMyNDA3OCwwLjUzODIzMjI2NjczMzk0NDgsMC42ODY3NDA0ODE5MDYxOTcxLDAuMjQwMzA3MTQwOTcwNDE3NiwwLjU5NjAxOTIwMjYxNTE3MjksMC4xOTgxMzkxODU0NjYwNzI4LDAuMDY1MjExOTU1NTIxNTk4Ml0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC45MzgyMTQ3Mjg3Mjg0MjA2LDAuNjM4OTAzMjg5NzYzOTM0NiwwLjU3NDUwNjg2MDY4OTY4NTksMC4zMjk4MDA3OTU2MjAzNzM5LDAuMzc0ODAxMDIyNTI0MzY1NCwwLjE1NTUzMTI3NDU3NTk0MzQsMC4zNDg4ODY1MzY4ODA5ODE1LDAuMjI4ODYwODkwMTU4MDA0N10sXCJpbmRleFwiOjE1fSx7XCJpZFwiOlwiMC45MnBtcWZ0bTA3OFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuMjA5NDAxODYzNTc4MDQzMDIsMC45NjAxODMxODU1Njg0NTAyXSxcIndoZWVsX2RlbnNpdHlcIjpbMC42MDc0ODY1MDYyNTUyNTM1LDAuNDg3MjE0MDg0ODU3NzQ0XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjg4Nzk3Nzk1ODE0MTczNzNdLFwidmVydGV4X2xpc3RcIjpbMC4zNzIyOTM1ODkxMTcwOTU3NiwwLjMyNTA2MzgxNDkzMDI0NjMsMC4wMjM5OTYyNDMzNDE2NzI5NCwwLjUwNzY4NDQ5MjU5MjkzNjksMC45MzYxNzg4NzA2MzYwMDc3LDAuNTU5OTg3NzY3NTE5ODAxMywwLjYxNzg3NjE3MDE5NDUxOTcsMC4xOTE5OTUxNTQxMjQ1OTMyMywwLjQzNjg5Mzk5NDQ5MDk2MiwwLjM0MDk3MzE0MjMzNzc0OTgsMC40OTgyNTU5NTAwNTYwMjc1LDAuMzAxODA1NDc3OTg2MzM0NF0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC40ODA1NTY3OTkyNDE2OTI4LDAuNTI5MTcyOTcxNTA4NDI1LDAuNDU3NjgyNDQ5MDE4NTg2NywwLjI4ODE1ODE2MjU5OTY2ODUzLDAuNDEzMDcwMzgwMjEyNzc1NzYsMC44NDk2MzAzMTAyMTUwMzE1LDAuNDQyNjI0MDk0MTAyODA5MjMsMC4xMTg5OTA4MzUzOTczNjFdLFwiaW5kZXhcIjoxNn0se1wiaWRcIjpcIjAucDBiYjNqY3NhNm9cIixcIndoZWVsX3JhZGl1c1wiOlswLjgwNTM3NzA0MDkzNjM4NzYsMC4wMDQ2MDg1MTE1MDU4NzY0ODldLFwid2hlZWxfZGVuc2l0eVwiOlswLjM3MDMyOTM2NTg1MzE5ODUzLDAuOTExMDcxODI5MDczOTkwM10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC40MTI2ODkzMTM2NjU1NTUxN10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjM3NTA1NTI5NjE2ODg3NDQ1LDAuMzI2OTg5NDU1NTc4ODQ3MywwLjc4MjQyODczMzk2MTc4OTcsMC4wODkxNjc1NTI2MDI3MjYwMiwwLjExODQ2MzY4Nzg5OTU4NzcyLDAuNjE4MjMwNTQwMjA2OTg0OCwwLjY4ODM0Njc0ODAxNTg5MjksMC4zODE3NzkwNTIxNDk5NTY2NywwLjcyMDgxODE2MDk1OTE0MzMsMC43MTgyODExNjcyOTgwNzMxLDAuNTA1MzQwMzk4MjQzMzk2NiwwLjY3ODU0ODU5MDM4ODkzOTJdLFwid2hlZWxfdmVydGV4XCI6WzAuODYwMjUxNjQzNDY2NzEyNywwLjkxODI0MTI4OTU2NDg3MTMsMC40OTQzMzIxNDQ2NDk0MDU4LDAuNDA2NjgxNDQyNDA1MzYzMywwLjk0NTAwMzM5MzQ0MzY5NjUsMC4wNDE0NzY3ODQxNjkwMywwLjkwNzQzMDMxNDEwMjUyODIsMC43OTIwODA1MzE4MTM5Mjk1XSxcImluZGV4XCI6MTd9LHtcImlkXCI6XCIwLmc2bnVlNDBvNnVcIixcIndoZWVsX3JhZGl1c1wiOlswLjI1OTUwMzY1MTc5MDg5Mjg1LDAuNDUxMTcxOTY2OTYzNjE1MTddLFwid2hlZWxfZGVuc2l0eVwiOlswLjg3Mzc3NzMyMDc0OTE2NDYsMC4zODI1MDQ5NDU5MTc1OTg0XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjU3NTA2MzYwNTY0MzI2NDNdLFwidmVydGV4X2xpc3RcIjpbMC4xNjE1NTA3NzI3MjI3NDM2NSwwLjE3NDAxOTE0NzczMTcwMjM1LDAuNDI4NzU4MDc4MTA3NjQ4MSwwLjQyOTMyOTIzODYwMzA1ODI3LDAuNDc2MDgxNDM1MDY3MzEzMjYsMC4wMTYxNDE2NjYxODIxOTgwMzMsMC43NDkwMDY5NTk5MjgzNjk3LDAuODc3OTE1NjYzMzc1NDk3NiwwLjYwODA5Mjg0NzAxODU1NzgsMC40ODQ1NzYzMTU0OTYwNjA1LDAuMTU5ODk2OTQ1MjU4NzYwNDEsMC41NDkyMzMwNjMyOTcxNzM0XSxcIndoZWVsX3ZlcnRleFwiOlswLjQ4ODY2MDQyNjc4NTk5NjIsMC45NTA3MTAwNTUzMzYwMjk5LDAuODk2Mzc4NjAwNDEwNjkwNiwwLjEzOTYyMDA0MjY4ODkwMzgyLDAuMDE3MTA1MzA1NzYxMzM5Mjg0LDAuMTIwMzIwODEzMDMyODU2OCwwLjkwMTY4NTk2NDU0NDAyNTQsMC4zMTI4Mjc5NjU5NTYyNjIwNl0sXCJpbmRleFwiOjE4fSx7XCJpZFwiOlwiMC51aWtwbTlybWJiXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4wODA2NDUxNTA0NzYyMDc4LDAuMDg0MjMxMDE0Njk4NDE1MzJdLFwid2hlZWxfZGVuc2l0eVwiOlswLjM0NDYzOTI4MzUwNDA2MTI2LDAuODY5NDg5NTAzMTQ3ODY3MV0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4xNDAwODQ4MTc5NjQ2MTUyNV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjY4NjAzNTU4Mjc4MjM2NzIsMC45NDc1NjM3ODM0MTgzNzQ2LDAuNTQ4MDQ0NjQ4MTg4MTk0NiwwLjI3MjkwNzI5MTI2NzgzMzQsMC45MTU4MDcxNjI5MDExNTgyLDAuNTQwMzY3NzMxMjkxOTI3NywwLjcxMTA0MzgzNzU4NDgwMzYsMC4zNDY2NjEzNTM1MTQxMDQ1NCwwLjc4MzU4OTI2NDc2MTMxNTQsMC4yNjkxNDAzMjcxNjk5NDA0LDAuMTQ0MzYwNDY0MTE2MjkwMzMsMC4yNzE2ODUxNjc5NDcwODc5N10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC44MTc2NTk0NzU1OTQ2MTg3LDAuNjYzNzM1NTI0MTQ0OTE2OCwwLjg0MDI0NzM5NDQ5NTkzODEsMC42NDM1NTgyMTMxMzAxNzc4LDAuOTE3MDQwODQxMDQyNjIzLDAuOTgyNDM4NzUyNTU4MzIxMSwwLjQ5NzkxNjM5NDQ2NjcwNjQ0LDAuMDA1Mzc3ODMwMTgyMzYxNDg3XSxcImluZGV4XCI6MTl9LHtcImlkXCI6XCIwLnBoa29kNGg2NjZvXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC4zODg1MTIxNTQ3MDUyMTE1LDAuOTQwODE0Nzc5Njg2NzE3NV0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNjA2Njc2MDQ5OTkyMDM4NywwLjc0Mzc4NTM3MzUxNDE0NzhdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMDQ3NjE5MzQ4NDYzNzQ0ODI2XSxcInZlcnRleF9saXN0XCI6WzAuMjgxODAxODE4ODk5NDY3MSwwLjUzNzY3MTEyODMyMzU1MTEsMC4yNzgyNjUyNDkzNDcwNTcsMC4zNzE4MDM4MDc0OTQwNDA2MywwLjAwMTYzNTQxMTI0NDA3NzA2NzQsMC4zNzM0OTIwMjk4NDA2NTM5LDAuOTI1ODI0MzY0OTQzMzU0NiwwLjk2MTEyODIwMTA2NDgwOTksMC4yNjM1Njc3NzU4NDQzMzAyLDAuMjk5NTEyMjY2OTY5ODc2OSwwLjQ1MDA5NTM3NjIxNjYzMTc2LDAuMTQxMjA0OTUwMTg5NjE5NTRdLFwid2hlZWxfdmVydGV4XCI6WzAuODIxMTUyNzAyNTMwMDI0MywwLjYzNzg1MjA2NDYxNTAwODUsMC44NDMzNjkxMjQyNDUwODg3LDAuMTAwODAxMTI1MzA1MTQ5MDYsMC43NDIwNTcxNzE4NjQzMjk0LDAuMDYyNDA2NTk0NDk1Mzc1NzgsMC41MDE5OTYzNzk4MjI5MTkyLDAuMTM5NTg4MDMzMjcwMzMyNzZdLFwiaW5kZXhcIjoyMH0se1wiaWRcIjpcIjAuY2RzYjJ0MGEwZ2dcIixcIndoZWVsX3JhZGl1c1wiOlswLjI0NTA1ODQyMTc2NjAxOTY2LDAuNDc5Mzc1NzA2NjE1ODgwMzZdLFwid2hlZWxfZGVuc2l0eVwiOlswLjczMTg5NjMzNTkxOTg4ODIsMC4yMDQzMzU5MTkwNjcxNDI1NV0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC45NDQwODA0MDEzODA4MDE3XSxcInZlcnRleF9saXN0XCI6WzAuMjc2NzE3NzE4NTczNTU3MiwwLjQwMTkxMjA2OTE5NzM5MjUzLDAuNjk5MjUyMDYzMTc1MzY0OSwwLjU4MDUzNjcwNTQ3NjU2NzMsMC41MzI4NzYwNjk0NTk1ODkzLDAuNjA1MTY1NTI2NjM5Njg1NiwwLjg2NTkzNzQ5MjM2OTgyMzMsMC42Mzg1NzQwNTE4MTY0NTkxLDAuMDkxMzYxNzU2NzI0OTUyOTUsMC4xOTQ2MjY3MTYyNjA3OTMzLDAuNTg0ODMyNDc4MzQxOTQ3MiwwLjk2MTIxMTUwNjk4ODk4MTddLFwid2hlZWxfdmVydGV4XCI6WzAuOTg0MDQxOTcwODY3NDQwNCwwLjQwMDIwNzgzMjg4Nzc1MzQsMC42MTE0NjY4NDkzMDA0OTY5LDAuMDU0NzY2MjgyNjk2Mzg3NSwwLjc1OTAyNjMyMzYxODY4OTYsMC45MDk1ODIxNzE4NDQzNjUxLDAuODI1Mjc4NTAwMTQ0NTE5MywwLjkzNTQ1NzM1MDMxNDQ3NzldLFwiaW5kZXhcIjoyMX0se1wiaWRcIjpcIjAuNWVjM2Y3dWM4NmdcIixcIndoZWVsX3JhZGl1c1wiOlswLjc0Mjg3OTQ1MjY3Mzc3MzksMC4xNDcyNzA3OTA1NTM1MzU1NF0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMjE3MjAxMzQzMjQ2NTc1NTgsMC41NzU0MjY4Nzk0MTQ2ODM3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjIyNDc2NDIxNDI0ODk3MDA4XSxcInZlcnRleF9saXN0XCI6WzAuODIxMjk2MzcyODE2MDEwNSwwLjIyOTczMzE4OTIyMDc0ODYsMC4yMTA1ODgxNzk3NzY0NTUyOCwwLjMwMDI4NjMzNDkxOTE0NDksMC4xNjA5NTQyNDExMzk1MzA4MywwLjI4NTcwOTc5MDM1MDAxODc2LDAuODUwNTA1MzIyNTk1OTIwNSwwLjAxMjA5OTc3NTU2NTI0NTY2MywwLjQzMDcxOTA5NzAyOTYxNDY0LDAuMzU4MTgyMDY3MzM5MDMzNywwLjk5NDEzOTY2NjMzNTA5NTIsMC4xNzExNTIwNDY2MzE2NDc2M10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC42MzQ5MzY1MDQzNjQ3MzkzLDAuODU2NDE2ODA1NjU1OTIyNywwLjgzNDczMTQxMDM5ODMxOTcsMC4wMTM1NjE2MDA5ODkxMTU1MTksMC4yMDQ3MzgxMzU1NTg5OTA3OSwwLjk3Mzc4ODk0OTUzMTUyOCwwLjMyOTg5NTU0NzU3MjAxOTEsMC43MDQwNDk4NzAyNjgyNDNdLFwiaW5kZXhcIjoyMn0se1wiaWRcIjpcIjAubzJtN2Uzamw1bVwiLFwid2hlZWxfcmFkaXVzXCI6WzAuODY2MTM2OTQ0NzQyMzA5MSwwLjM2MjA5MTg2NjM2ODU1MTczXSxcIndoZWVsX2RlbnNpdHlcIjpbMC4yNDg4NjM2OTk0ODI5NjI3MiwwLjk0ODExMzY3MDg5NjE2OTddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNDY0NTM0OTA3MTQyODU5N10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjM5NjMxNTgxNzE3NDAyMzMsMC4zMjU2Mjc4ODIyNDUyOTE2LDAuNDM1ODg2NTYyMTY5MzA4MiwwLjQxODAwNjU3NTY3MjAxMjQsMC4wMzM1MDc1Nzc5MDEyNjYxMywwLjI2ODEwNjc0OTU5NjI3MTksMC4xOTE0NTc5OTUyNjI2NzMzNywwLjczNzExMTE4ODQ5MTE1NjUsMC40NTAwNDA4OTU1MTk1ODg1LDAuMTA2ODgyNjE1Njc2NzkzNDcsMC4zODIxNTQxMzExNDY0OTIyLDAuMDA5NDE2NzUwNTQxMTcyMTkyXSxcIndoZWVsX3ZlcnRleFwiOlswLjk1NzU0NjI3MTI4Njc1NTEsMC41Njk1NTAwNzYyMzU1ODAzLDAuNzk4MTQ0MzAwMjE1NDYwNSwwLjk0NzQzMjg0MDM3NDk4MjMsMC43MDI3MDE2MDk2NDAwNzExLDAuODI4NjQyNDY2MzcxMzY5NiwwLjgzMTA1MDAwMDk0NjE3NzIsMC4yMDM4OTQ1MTc5ODMyMzU0M10sXCJpbmRleFwiOjIzfSx7XCJpZFwiOlwiMC52aWo3aDRsbDNpZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuMTgxNDk4MDA3NjE1NTQ4OCwwLjI2Mzg5NzYyMDUwNzIyNTY1XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4yODI5MzUyOTcyNzAzNTE4LDAuNzQyNjQ2ODk3ODE3NjUwNl0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC4wMTQ0ODY2NjI2MTM4MjMzNjVdLFwidmVydGV4X2xpc3RcIjpbMC4wNTMwODY3Nzc1ODYwNjIxNywwLjM2NjAzMjk5MjAwMDAxMDUsMC45MTU0NTg4MTExMTA5NzU2LDAuNjU5OTM2NzQwMzE0MjQ3MSwwLjAwNjIzNjcwMTAwMDM3MjEwMiwwLjk0MTY3Nzk3NTc3MzQ3MTcsMC44MDgwODA5Mjc4MzM5NjE4LDAuNDI0OTk3MTU4NTcyOTE4MiwwLjQzOTQyMDIzNjIzMjcwNzc2LDAuNDQ2MzIxNzgyMDQ0MzM0OCwwLjc0MDc1NzAyMDYzODk1OCwwLjA5MTU0Mjg2MzYyODU0MjQ3XSxcIndoZWVsX3ZlcnRleFwiOlswLjE3MDE0Nzg4ODcxMTM5OTQsMC4yMzk1MTUwMDAyNjY1MTY5NSwwLjg0MTcxNjA3NTMwNTAwODEsMC40NDY2ODYzMjE5NzMxMzc4NSwwLjc5ODQ3NDY2MjAxMTA5MDMsMC4yNDk5MzA1MDUwOTcyOTY0MiwwLjU5ODI2MTM0MTM3MTgwMzYsMC4wMjQ2MzQxNDMzODAzNzU2MTddLFwiaW5kZXhcIjoyNH0se1wiaWRcIjpcIjAudmJ1ZHBxN3I4amdcIixcIndoZWVsX3JhZGl1c1wiOlswLjE4ODA4MzM3OTIwODY1MzgsMC4yOTA5NDE3NTU2MjUzNzI0XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4zODM1MzUzNjA3NDg3NjM3LDAuMTI1NDI0NzExMjc4MDYxOThdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuOTkxNDg4NzI2Njc4NzgzNV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjE0MDgyMDIzMjc5NTE5NTMsMC45MDA2NTYzNzQ5MTcyNDU0LDAuMjg2MDEzMTg5NjU0Njc0NywwLjUwMzYwNTgyNjgwMTUwOTYsMC4yODIzNzE3NTM1MTQ2NDU5NCwwLjY5MjA5MzUwOTc3MTc1NDksMC40MDMwMDIxNDMwMjA1ODU5LDAuNDUyNjM0OTYyNTMzNDkzOCwwLjMyOTUxMDY2MTM4Njc1MDY3LDAuOTkxNTYzOTMwMzI0ODkyNCwwLjE1NDIxNDkxNzgwMTgwNTA3LDAuNTY1ODEyMDM3NjQ0NTAyOF0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC42MjA3Nzk2MDgxMjUxNDk4LDAuMDg0NTc1MjkzMjE4Nzk5OTcsMC4zMDk1OTYwODkzNDUwNDU1NywwLjkyODk4ODc5MDE1MDYwNzUsMC4yMTEzNDQyMDA5MDAwMTAzOCwwLjI2NjE1ODQ3NDA0NzgxMDQ2LDAuOTY3OTk4NjMyNTk5MjU3NiwwLjAzNjM5MzI2NjYwOTA1NjI4NV0sXCJpbmRleFwiOjI1fSx7XCJpZFwiOlwiMC40aWdrczc3ZGZsZ1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuNjE2MjYzMDY4ODgwNTEwOSwwLjk5NjMyMjE5NTcyNDExNl0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMDcyMTkzODk1NTgzOTUwMjgsMC44MTYzMDkwMDQxNTc5NDIyXSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjY0NjM4NzE3MjQ5MjQ3NjhdLFwidmVydGV4X2xpc3RcIjpbMC4xNDY4NjI4MjkzOTU5MjczMiwwLjM1Mzg2MjQzMzgwODkwMzgsMC43MzUyNzg5MTA3MTcyNTA4LDAuODMzNjIxOTEzMTMzNDkwMSwwLjEzNDU4NDQyMTQ5NDc5MTEsMC4wNjk1NzExNjY2MjM1MzI4LDAuMDU4OTE1NzQ5NjExNDIwNTQsMC41OTE1MDgyMTEzMjY5NTY3LDAuODEwNjA5OTA4MTc1NjY5NSwwLjA5NTg3NjMxNzQyNTg3ODk5LDAuOTc3NTc4OTE2MjEzMDU1NywwLjYyMDAxMTAwMDI1MTEzN10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4yMzg2OTE2NDMxNzI5OTA2MywwLjQ2OTYwODIwNTM0MzQyNzg0LDAuOTgwOTIwOTQzMzk4MDI2OCwwLjA5NDA4NzE3NTE3NTk4OTUyLDAuOTU5NjIyODQ1ODYxNTQ5NCwwLjE0OTMxMDY2NTAzODUwMTIsMC41NDI0MTE2OTQ5ODgzNDE1LDAuMzUwNjg3NjIwMzkxNDkyMzddLFwiaW5kZXhcIjoyNn0se1wiaWRcIjpcIjAuaTdpbjcxMGYzOThcIixcIndoZWVsX3JhZGl1c1wiOlswLjAxMDc0MjQzNTM1NzA2OTk4LDAuMzc0OTYxNTAyNDQzOTU0NzZdLFwid2hlZWxfZGVuc2l0eVwiOlswLjIxNzYxMTYzMDMzOTg3NTg1LDAuMjg3NzA2OTA0MTcyNjY5ODZdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNzc4ODUwNDc3NDcwODcwN10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjkwNjUwNDUyOTQ1MjcwNjEsMC4wODMyMDMwODM0OTg3NTczOCwwLjAzNDYwODY0NzI4Mjc4MDY4LDAuMTI4ODU0NTk0OTgyMDM3NDQsMC43MDM2MTIwMTEzNTg5Mjk3LDAuODMwMTE1ODE1MTg1ODcxMiwwLjM5NTc3NjkxNTg0NDI3MDEsMC45ODk3NjE0MzQ1MTgxMzkxLDAuMDgwODgxNTM3MDU2MTk1NSwwLjk0MzU0NjA2NjczNTE2ODUsMC4zMDcwMjY2MTM0OTAxNDI3LDAuMDU1MjMzNDcxMDI2MjQzODc0XSxcIndoZWVsX3ZlcnRleFwiOlswLjIyNzA2MjQwNzg2MjkwMTMzLDAuNDUzNjM4ODI4NTgxMzQ2NjMsMC40MDQzMTEwNTQzMzg4MDcxLDAuMDQ2NjIxMzMyNjc4NTczNiwwLjE3Mzc2MTMwNTQ4Nzc3MzEzLDAuNjQxOTQxNjA1NTQyMjE5NiwwLjQ1MDM0MTgyMDUzNjM4ODk0LDAuMDYzMDM0ODY0OTU0NjIzNTJdLFwiaW5kZXhcIjoyN30se1wiaWRcIjpcIjAuOTZpdnFwcGVnYWdcIixcIndoZWVsX3JhZGl1c1wiOlswLjQ5MTExNzkyMzA5MDIwMDUsMC4zNTA0NjQ0NDY5MTkzOTA5NF0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMzM1MzQ0NDk2NzI4OTcwMjYsMC45MzM1MTc2NTgwMDMyNDI3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjMxOTU3NTM4NjY0MTEwNTc0XSxcInZlcnRleF9saXN0XCI6WzAuNTkyNjI1NDg3Mzg1OTM1MSwwLjcxOTIwODc5OTUyMjk4NDYsMC40ODQ0OTE2MzA0NjkzODgyNiwwLjc4MjA3NTc2MTYyMDg1ODIsMC43NDYyMDU0Mzk4MjQ1Nzc0LDAuMDkwNDI2MjQ2NTMyMDMwNDYsMC4xMDcwMjU4MTUwMzU0Nzk5MiwwLjkwNjE4Nzg3NzM2MjY5NjMsMC42NTIyMjk0MTIyODQ1Mjk0LDAuNjc3MjcxMTM1MTkyMzQ5NywwLjAyNDUxMTY5MzU1MjI0MzgwNywwLjgwNTQ1OTMxNDMwNTgzNTVdLFwid2hlZWxfdmVydGV4XCI6WzAuMzYwMjk4MTA0MzgzMzMwNjUsMC42MDY1MjM3NjA2MjM3MTQ0LDAuMzI2MDIxMzIxNzEyNDI2MzcsMC41OTQwNDE1NzE5MDc2NDA2LDAuNTgyMTA1ODY5NDgwNDQ0MiwwLjY0NzQ2OTA4MDA2NTAxMDcsMC41OTA2NTYyMjU0ODE3NzAyLDAuNDc3NTQ4NDM5OTMyNjU1OTRdLFwiaW5kZXhcIjoyOH0se1wiaWRcIjpcIjAuZmZxOGRlcGNocGdcIixcIndoZWVsX3JhZGl1c1wiOlswLjE5NDI0MTE0NDAzNzg0NTU0LDAuNDExMTYxNTAyNTQ2Njc1N10sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNzE2MTExOTUyNjk2OTAzNSwwLjkyMTA5MTQyMTg5NzkzNjddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNjcyNjA2NjQyNTg3NzU5N10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjYwODcyNTE0OTE3OTA2MzEsMC43MTI2OTIyNTYzNjA4Mjk4LDAuMjg0ODEzMzIxODI0NTAyOCwwLjI1Nzc3Nzg5MzA1NjAyNjQsMC45MzIyOTE3NTA1NjA4NjksMC4yNjAyNDYzNDM4NjE4MDQ1NiwwLjkwMDg2MDgzNjk3NTE3NDksMC44MTk2ODYxNzkzNDAyNjg4LDAuMDQ5NzgxMTI4MjUwNDQ2MTE2LDAuNDk4NDY4OTY0OTkxNzYwNjMsMC40MjIwNjc3NjI2Nzk4OTg3NiwwLjEzMjgyNjQ3Mzg5OTE4Ml0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC41NTI3MDcxMjcxNjQ3NDMyLDAuNjAwNjY2MzA5MzkxOTE0NywwLjg4ODg3MDc2NDc4NDM3MTQsMC4yNDQ3MjcxMzA0MTYzMDIxMiwwLjkyNjQ0NDkzNjc3ODY0OTQsMC4wMDg2NzM5ODMyMjAzNDI4NTEsMC42NTYxMjY4NjM5MzA1OTM3LDAuODAwODY5ODQwNjAxOTE1XSxcImluZGV4XCI6Mjl9LHtcImlkXCI6XCIwLjMxazFic2EyOXY4XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC41MjE2NTc5NzIzMjI2ODg0LDAuNjkzODAzODc4MjUyMDU3Ml0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuNzUxMDUwNDkzMDg0NjM3OCwwLjkzNjAyMTE2NzE2NDEzMzldLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuOTkxOTY5MjU0NzgzMzU4NV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjYyMDIyNTM0NTA2NjI3OTgsMC44NDA4OTMyOTAyMjg4MDI5LDAuMTQ2NzA3OTk1NTYwODk0MywwLjk4NTA0NTAzMDEyNDE3MjQsMC4yMzM0NDQ5NzYxOTEyMjAzLDAuMjg5NzkxMjMyNzMyNTQ2MDMsMC4yNzA5MzgwODAxNzU2Nzg2NiwwLjE5MDcwNDYyMzc0NzgzODkyLDAuMDUzMzYwNTk3ODI5NDI4MjYsMC44Mjc2MDcyOTI2NjMxODMsMC45MzE5MTIzNDIxOTI1NDksMC40Mzc2NzE3NjI4NTk1NzY3Nl0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4wNDE1ODY2OTQ3Mjg2NzA3MTQsMC4wNzI5ODI3MTc1MTkwODA3LDAuMDE2OTE2MTU0OTA1MjkwNzQ4LDAuNDkwMTQ1NDU5ODgyMzIwNSwwLjIzMTE5ODkzNjc5NjY1ODI2LDAuMDI1MTMwMDY4MjMyMTQ5MzYsMC40ODkzODkwOTg2MzkyNTk5NSwwLjM4ODQzNTAxNzA1Mzc3NDVdLFwiaW5kZXhcIjozMH0se1wiaWRcIjpcIjAuOTBra3ZiNHVjaG9cIixcIndoZWVsX3JhZGl1c1wiOlswLjkxMDEwMzc5OTI3ODU0NzIsMC40ODc4NTkyNDcwMTE1OTEyXSxcIndoZWVsX2RlbnNpdHlcIjpbMC4zODQ4NDc3OTcwODI0NjMxLDAuNDUzODkwNDk2OTc5NjEyMDNdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMjYwODAwNzk4OTM2OTMxNjRdLFwidmVydGV4X2xpc3RcIjpbMC41MzE3OTMyMDc1OTM1MjE0LDAuNjg3ODE4OTMxMDIxNDE5MSwwLjk4MDMxMDE0OTM3MTExNzcsMC43NjU3NTE2NTUwNTM0MzQsMC40MDYwMTg3MTgzMjE2OTg4LDAuMTE4NDg3Mjk0ODkwNzI4NTEsMC41NzM1MjQyMjU5MDc4NTIzLDAuOTg4ODM3MzE0MDE3MTM0MywwLjY2MzE0MjE3NDc4MjA5MTEsMC41NDMwMzI5ODYzNjIwMjE2LDAuNDU5ODI5OTk0MzU4MzY2MTMsMC44OTY5Njc2NTE3MDM2MDIzXSxcIndoZWVsX3ZlcnRleFwiOlswLjQwNTQ1NzI2MjA4Nzg0OTYsMC4zODE3MDU2NTgzMzUxNjEsMC42MjM0OTUxNDYyMzgxNjU3LDAuNjQzMzI4ODU1OTczNDUzOCwwLjg1NzIyODI2NjQ5NzkzMiwwLjg5OTU1NDk3NDExOTkzNjcsMC4wNzY1MTEzMjc5MzIzMTg4NSwwLjc3MTE3NjUyODY5ODUzNjhdLFwiaW5kZXhcIjozMX0se1wiaWRcIjpcIjAuYWpndGNpM3NjZzhcIixcIndoZWVsX3JhZGl1c1wiOlswLjMzNTE5NDgxNDA2MTcxODksMC42Mjk5NzMxODc5MDg3NTM4XSxcIndoZWVsX2RlbnNpdHlcIjpbMC40MTUzNDE4NjgxMDI4ODU1NCwwLjI3MDQ0MTM1MjcyMjMwNDJdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuNzAxMzcyMzUyNjI3MTUwOV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjc0MTU3ODI1OTI2NjkxMzgsMC42MzUyNjQ0NDMyOTE4MjkzLDAuMTczNjY2MDI1OTYyMTA5NjcsMC41MDcyMDY3OTM0Mjc0OTczLDAuNTkxNTU2MDQzMjAxMzg3NSwwLjQ1NDkzMDExMzI1MTY4NDUzLDAuMjY0OTQwOTIzMDUyNDQ5MywwLjc1NjIxMTAzNTY1MjQ5MjMsMC4wNzg1MzI5MjE2NjgxMzc0MSwwLjYxNTQzNTg3NjA3NjI3MjEsMC44MTg4MDMwOTg5ODUxODA0LDAuODc0ODMxMDM4OTE1MzQ1N10sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4xMDg2MjM0OTczMTgwNjMwOSwwLjU4NTc2MjM2Njg0Nzc4NDUsMC40NzM0MDc4NjA3OTc1NzkzNSwwLjI2NjY2MTYwMTU2MTQxNDA1LDAuNzExNzAyNTkzMjgwNjUyMiwwLjUzMzQzOTI4NTEyOTQ5OTgsMC45NzQwMjA0NzEwMzQ2ODc2LDAuODExOTQ4OTQxMTQ4NDkyMV0sXCJpbmRleFwiOjMyfSx7XCJpZFwiOlwiMC5pajZubGxjYzZqOFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuMDY1NzY1MzYwNzE4ODM3NzYsMC4yNjk4MTM0NjA2MTY4NjU2XSxcIndoZWVsX2RlbnNpdHlcIjpbMC4xMDgyNjk4ODk2NDE0Mjc4MSwwLjQyODA3OTM4NDA2Mzk3NzZdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMTI0NTE3NTM1NTU4ODkwNTZdLFwidmVydGV4X2xpc3RcIjpbMC45ODU5Mjc2NzU2NTkxOTgxLDAuMzIzNjE1NjE3ODMxODI1NywwLjIzODgxNzEwOTg5MDYwNzEyLDAuOTA4NTA0NDgzODMxMjk4NiwwLjA3NTkwOTE4NTE5MTQzMjg2LDAuMTE3ODMwMjY3NjE1MDE0OTIsMC43NTQ1NDk0NzQzMTgwMTA4LDAuOTgzMDkyNjIyMjYxMTgzMywwLjIwNTUxOTA3NDMxMjg3ODMsMC43MDg0MjczNTUzODkxNDA1LDAuNjE4MDc5ODEyNDc3NzIyNSwwLjAzODM3NjU4Mzc4ODA4NDk1XSxcIndoZWVsX3ZlcnRleFwiOlswLjI2MjU3OTU4MzI5MzY3ODE0LDAuMzc0MjI3NTYzNDM1NDQ4ODMsMC45NzA2NjM3MDk3NzIzODM4LDAuODI3MDQwMjg3MjkxNjk3NSwwLjY0MjM0NzA2MDI4NjE1MjcsMC4zMDQ5NDY5NjAzOTM2ODQxLDAuMDIwMzE1NDI0NDIxMDI1MDc1LDAuNjczMTU0MjMxNTY5MjE5Nl0sXCJpbmRleFwiOjMzfSx7XCJpZFwiOlwiMC5jZmFtamtnZTE0XCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC41NTUzMzcxMjIzNDQxMzI2LDAuNDgyNTU5NTI1NDUzMDExOTVdLFwid2hlZWxfZGVuc2l0eVwiOlswLjEwMjMzNTY3OTU1OTU3MTEyLDAuNDExODY2Mzk5NDYwNjQ2Ml0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC44NTA3MDEwMzcyNDk4MjAzXSxcInZlcnRleF9saXN0XCI6WzAuNDQzNTUyNjE0NDQxMDgxNSwwLjc5NTI1NzExNjEyMTYwMTUsMC42OTU2Njc0Mjk4NDgxNjk4LDAuNzcwMDM4MTE1MDQyNjI2OCwwLjAyNDQzNzc5MTkyMjY1NzI3LDAuMzMxNDkyNDIwMjI2NDUyNCwwLjUzNDg0NzI4NzIxNzY4OTMsMC4xNjk5ODk4MzU4NzExNzQ0NCwwLjM3MDI1Njc1MzE2MzYzNTgsMC4xMzI0ODg3MTEwODM1OTM5NSwwLjMyNDIxMTUyOTA4MDgwMjUzLDAuMTIzODQzODk5MzU0Mjk1ODVdLFwid2hlZWxfdmVydGV4XCI6WzAuNTU2MjM2MTc3NzQxMzExOCwwLjAyMDE4MTk3MzI3MzAwMDQyLDAuNjY1Njc3Mzk2Njk4Njg4MiwwLjM0MDU2NzA3NTQ5MTY3ODk3LDAuMzIyODY4NzI0ODI4MzAzMSwwLjAwNTQ2ODk2MzI4MDc5MjI3MiwwLjI0ODc0MTMyMzEyMzEzMTY5LDAuMDA3NTY4MDI5NDE3MzI5MjU4XSxcImluZGV4XCI6MzR9LHtcImlkXCI6XCIwLjg5N3VwdXNwMDBvXCIsXCJ3aGVlbF9yYWRpdXNcIjpbMC45NTA2MjIxMDU3NzM5Mjg4LDAuMjYzNDY3ODI4ODc4NzI2XSxcIndoZWVsX2RlbnNpdHlcIjpbMC43ODEwMTY2NDUzNDY0MzczLDAuMzg2NDc5OTI5OTg4OTgyMDZdLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuMDczNTQyMTgyNTc4MTI1NV0sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjMzMzczMTE0MTE1ODcxMTE2LDAuMDk4Njk4NjExMjE3MjgyOTYsMC4xNTU1ODU1MTQ2NTE5MDI1LDAuMzE3NDg3MzE4NzIxNzg1NSwwLjQ3NTI4MjY3NzA3NzMzMjYsMC4zMjk5MTU5ODkyNzk3NjU0LDAuMTk2MDAwOTc5Njc1MjQ1NTUsMC4xNDkyNTE3MDk2NDE5NTYzMywwLjAwNjg2NDUyNDA1MjcxMjk4NCwwLjc1MzI0ODkwMTc1NTQwMjMsMC40MzgzNTQxNzIwNTI2NzYsMC4zMTEyNDAxMjQ3NzY4NTIxNV0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC44NDk4NjczMzI4OTUyNTc1LDAuNDg4MzMyNTAxMzk2MzMzNTUsMC43MTQ4MDE2NDc1NTQyNzYsMC44OTg3MTA0MTM2Mjg1MTk2LDAuOTM4NDEwODQ5NDc5MjY0NywwLjg4Mzk4NTM4NzY0OTE2MzksMC40MTk0MDExMDU3NTYyMTI2LDAuNTAyMjQ3Njk0OTAzNjQ1Ml0sXCJpbmRleFwiOjM1fSx7XCJpZFwiOlwiMC5ldWd1ZTlwYzdxb1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuMTQ1ODA4NzkzODI4MTQ0OTMsMC44NzQ0MDA5Mzc1ODEzNDJdLFwid2hlZWxfZGVuc2l0eVwiOlswLjM1MDU3ODI2Mzc2NDc0MzQ0LDAuNDkwODU3MTI3NTczNzE5NDddLFwiY2hhc3Npc19kZW5zaXR5XCI6WzAuOTI2MTQ0OTgxNzg1MDUyN10sXCJ2ZXJ0ZXhfbGlzdFwiOlswLjE2NjkwMjc5NzgxNTcxNTYsMC4yNjg4NTMwNTYxMzQ4Mjc5LDAuNDEwMjM3OTI5MDIwNDc5MiwwLjU4MTQyNTk1NTY0MDU1NjgsMC40NDk1NzgxMjMwOTA5NjYzNCwwLjc1MDcwODM1NzI0MTY3NDQsMC4wNzI4Nzc3MzMyOTcwMTU4NiwwLjc5NzQzNjc3MzY2MjU3MjUsMC4wNjg0NjE4MDc4MzA3NzUyNywwLjczNDQ3NTQyOTExOTE1NDksMC41NzAzMDI2NzU5MzI5Njc3LDAuNjI4OTMzNTU3NDk1NTY3XSxcIndoZWVsX3ZlcnRleFwiOlswLjc5MTcxOTIzMjgwODYyMjksMC41NzA4MDE5MDIzNjU5NjIzLDAuNzc2NTI1MDIwOTE1NzkzMiwwLjI5MjY0MjM0NjYwMTQ3MjI2LDAuMjc5Mzg5MjMzNzg5NzUzNDQsMC4xNDM0ODEwNjEzNTEwNjA0MiwwLjU2MDkxNjc1NTUwODc4NTUsMC41MDQ3NDQyOTM4MTkyMzM5XSxcImluZGV4XCI6MzZ9LHtcImlkXCI6XCIwLmw2c2NsNW50amRcIixcIndoZWVsX3JhZGl1c1wiOlswLjI0NTU3ODEyMTQ4NzUyNTY3LDAuNjc0MDQ5NjA0MzcwNjg4MV0sXCJ3aGVlbF9kZW5zaXR5XCI6WzAuMDc4MDA0Nzg3OTA2MDM2ODIsMC41MjI0Mjk1NjczMzg1NDU3XSxcImNoYXNzaXNfZGVuc2l0eVwiOlswLjA0NjA4ODUxMTcwMzIwNTQ5XSxcInZlcnRleF9saXN0XCI6WzAuMzA3NTM1MzI1ODA2NzMwNiwwLjk0NjQ5NzQxOTk2NzgwMiwwLjQwNjI5MjIzMDI5NDM4NTY2LDAuMjc2Mzc0MTA3ODk4MjM4NywwLjI1NjQwNDc0MTMyNDU0MjcsMC45MzExNTM4OTkzMjQwMzg5LDAuNjQ1MzI1NDE2MzQwNTMyMiwwLjYxMTQ3OTY4Mjg5NjQ1NDQsMC41Mzc4MjgyODgzOTEwMjQ0LDAuMTk5MjE2MDk4NDY2NDQ1MjgsMC45NjUzNzg1MzQ1MjUwMTk0LDAuMzk3ODkwOTY4NDk5MTQ2MDddLFwid2hlZWxfdmVydGV4XCI6WzAuMTc1MjYwNjM3MTExOTY0MDUsMC41MjE5MjI3MzY0Nzg1NzE1LDAuMTkyMjg0MDA4MjgyODU2NTIsMC40NzQ3MTE5ODEyMDgyODM0LDAuMTI5Mzk5NTE5NzYzNzY0MDcsMC45NzE5MTU3NDU5MzM2NDIzLDAuMDU4NTUwNTc1NTAwMzM5NzEsMC4xNzAxMTYwNjgwMDM1OTA0N10sXCJpbmRleFwiOjM3fSx7XCJpZFwiOlwiMC5za3I2bW1pMHN1Z1wiLFwid2hlZWxfcmFkaXVzXCI6WzAuMTMwMTk5MDM1OTUzMTUxNzQsMC42OTc4ODQ3NDEyMTUzMDg5XSxcIndoZWVsX2RlbnNpdHlcIjpbMC45MzgwMzgzOTI5MTY4Mzc5LDAuOTAwNjI2MzE1Mjc5NzU5Nl0sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC41MzYyMTUzNTcyMjE1NDk2XSxcInZlcnRleF9saXN0XCI6WzAuNzg5ODUzMzIwMzQ1MjAzMiwwLjA0ODI2OTk2MDk1OTUyMTg1LDAuMTA0NjE2OTA4MDc0MzYyODYsMC4xOTE0MzUwODYwMDg0OTE0NiwwLjgxODc1NjE4NDY4OTI1NDQsMC4yNTM1NzY1MDE2NTY4NDgzLDAuNDY0NDI3MTA5MzEwMzE1NCwwLjc3NDczMjE2NjM1NjU2MDUsMC43MTU1ODg4NTY0MDk5NTY2LDAuMjI3NzM2ODQ5ODUwMjA3NDgsMC44NzY0MDQyNDA4MDY5NzEyLDAuMjU2NTAwMTk4MjIzNDkzNTddLFwid2hlZWxfdmVydGV4XCI6WzAuOTc0MjI0NTQ5NjUwNzI4NSwwLjM4NjQ5NTE1MzQ2Mjg2NTU2LDAuMzMwNzA0ODMxMDI3MDk3LDAuODY5NTExNzMwNzIxNzM3NSwwLjgzMjQyMTM1NTYwOTkwNzQsMC4xODE1NzM0MTcwMDQ2MDA0LDAuNDA2ODUyOTM3MTQ3Nzc3MTUsMC4zNjc3NDA4NTgxMzE5MzYzNV0sXCJpbmRleFwiOjM4fSx7XCJpZFwiOlwiMC4wYm9kOHVsdmU1OFwiLFwid2hlZWxfcmFkaXVzXCI6WzAuNTY5MDgzODIwMjM1NDE1NiwwLjI0OTQ3MzE3NzA3MjMzNjYzXSxcIndoZWVsX2RlbnNpdHlcIjpbMC41MzI3MTcyNDQyNDE2MDk1LDAuNTIyMTgzMTQ5NjE3ODc1N10sXCJjaGFzc2lzX2RlbnNpdHlcIjpbMC44NTg2MzgzMDM5Mjc0MzNdLFwidmVydGV4X2xpc3RcIjpbMC42NTQ0MTY1ODQ5ODU2NzA3LDAuNzkyMTY3MDY1NjEyMDY5NCwwLjIyODI4MTAxNTkxODg2NTUyLDAuNjYwODkxMDUzNjU1ODg2NywwLjAyNTI2MDM1NjQyODkzMTA5NywwLjcwNDQ2MTQyMDkyNzE5MjQsMC45NzYxOTA3MjI4OTYyMTk0LDAuNDcxMTY0OTIwOTE0Njg5MywwLjU3MjcwNTAyNzU0NzM1ODQsMC44MjcyNzU2NjM1MjA0MjQxLDAuMzk4MjU1NzIxNTM0NTI4NCwwLjU0NjcwODgzMzQxNTYxNF0sXCJ3aGVlbF92ZXJ0ZXhcIjpbMC4yMDI1NTk0NjQxNjY4MTYwMywwLjI4MjQ1Nzk5MjA3ODIyOTEsMC4zMDE4NTE4OTUwNDA2MzcyNSwwLjczNzMwOTE5MjEyNDM0MjIsMC44MzUzMTEzNjM5MTY5NTQ1LDAuODc4NzMwODA2MjcwNzQzNywwLjIwMjIzMDA0NDg0OTMwMjg1LDAuNzgxMjc2NjQ0Mzc4ODk1OV0sXCJpbmRleFwiOjM5fV19IiwidmFyIGNyZWF0ZSA9IHJlcXVpcmUoXCIuLi9jcmVhdGUtaW5zdGFuY2VcIik7XHJcbnZhciBzZWxlY3Rpb24gPSByZXF1aXJlKFwiLi9zZWxlY3Rpb24uanMvXCIpO1xyXG52YXIgbXV0YXRpb24gPSByZXF1aXJlKFwiLi9tdXRhdGlvbi5qcy9cIik7XHJcbnZhciBjcm9zc292ZXIgPSByZXF1aXJlKFwiLi9jcm9zc292ZXIuanMvXCIpO1xyXG52YXIgY2x1c3RlciA9IHJlcXVpcmUoXCIuL2NsdXN0ZXJpbmcvY2x1c3RlclNldHVwLmpzL1wiKTtcclxudmFyIHJhbmRvbUludCA9IHJlcXVpcmUoXCIuL3JhbmRvbUludC5qcy9cIik7XHJcbnZhciBnZXRSYW5kb21JbnQgPSByYW5kb21JbnQuZ2V0UmFuZG9tSW50O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgZ2VuZXJhdGlvblplcm86IGdlbmVyYXRpb25aZXJvLFxyXG4gIG5leHRHZW5lcmF0aW9uOiBuZXh0R2VuZXJhdGlvblxyXG59XHJcblxyXG5mdW5jdGlvbiBnZW5lcmF0aW9uWmVybyhjb25maWcpe1xyXG4gIHZhciBnZW5lcmF0aW9uU2l6ZSA9IGNvbmZpZy5nZW5lcmF0aW9uU2l6ZSxcclxuICBzY2hlbWEgPSBjb25maWcuc2NoZW1hO1xyXG4gIHZhciB1c2VGaWxlID0gZmFsc2U7XHJcbiAgdmFyIGN3X2NhckdlbmVyYXRpb24gPSBbXTtcclxuICBpZih1c2VGaWxlPT09dHJ1ZSl7XHJcblx0ICBjd19jYXJHZW5lcmF0aW9uPSByZWFkRmlsZSgpO1xyXG4gIH1cclxuICBlbHNlIHtcclxuXHQgIGZvciAodmFyIGsgPSAwOyBrIDwgZ2VuZXJhdGlvblNpemU7IGsrKykge1xyXG5cdFx0dmFyIGRlZiA9IGNyZWF0ZS5jcmVhdGVHZW5lcmF0aW9uWmVybyhzY2hlbWEsIGZ1bmN0aW9uKCl7XHJcblx0XHRyZXR1cm4gTWF0aC5yYW5kb20oKVxyXG5cdFx0fSk7XHJcblx0XHRkZWYuaW5kZXggPSBrO1xyXG5cdFx0Y3dfY2FyR2VuZXJhdGlvbi5wdXNoKGRlZik7XHJcblx0fVxyXG4gIH1cclxuICByZXR1cm4ge1xyXG4gICAgY291bnRlcjogMCxcclxuICAgIGdlbmVyYXRpb246IGN3X2NhckdlbmVyYXRpb24sXHJcbiAgfTtcclxufVxyXG5cclxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gbXkgY29kZSBqb2I2NFxyXG4vKlRoaXMgZnVuY3Rpb24gbG9hZHMgYW4gaW5pdGlhbCBjYXIgcG9wdWxhdGlvbiBmcm9tIGEgLmpzb24gZmlsZSovXHJcbmZ1bmN0aW9uIHJlYWRGaWxlKCl7XHJcblx0dmFyIGZzID0gcmVxdWlyZSgnZnMnKTtcclxuXHR2YXIgYXJyYXkgPSBbXTtcclxuXHR2YXIgZmlsZSA9IHJlcXVpcmUoXCIuL2luaXRpYWxDYXJzLmpzb24vXCIpO1xyXG5cdGZvcih2YXIgaSA9IDA7aTxmaWxlLmFycmF5Lmxlbmd0aDtpKyspe1xyXG5cdFx0YXJyYXkucHVzaChmaWxlLmFycmF5W2ldKTtcclxuXHR9XHJcblx0cmV0dXJuIGFycmF5O1xyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gQ2hvb3NlcyB3aGljaCBzZWxlY3Rpb24gb3BlcmF0b3IgdG8gdXNlIGluIHRoZSBzZWxlY3Rpb24gb2YgdHdvIHBhcmVudHMgZm9yIHR3byBuZXcgY2FycyBzdWNoIGFzIGVpdGhlciBUb3VybmFtZW50IG9yIFJvdWxldHRlLXdoZWVsIHNlbGVjdGlvblxyXG5AcGFyYW0gcGFyZW50cyBPYmplY3RBcnJheSAtIEFkZGluZyB0aGUgc2VsZWN0ZWQgb2JqZWN0IGludG8gdGhpcyBhcnJheVxyXG5AcGFyYW0gc2NvcmVzIE9iamVjdEFycmF5IC0gQW4gYXJyYXkgb2YgY2FycyB3aGVyZSB0aGUgcGFyZW50cyB3aWxsIGJlIHNlbGVjdGVkIGZyb21cclxuQHBhcmFtIGluY3JlYXNlTWF0ZSBCb29sZWFuIC0gV2hldGhlciB0aGUgY3VycmVudCBzZWxlY3Rpb24gd2lsbCBpbmNsdWRlIGFuIGVsaXRlIHdoZXJlIGlmIHRydWUgaXQgd29udCBiZSBkZWxldGVkIGZyb20gdGhlIE9iamVjdCBhcnJheSBhbGxvd2luZyBpdCB0byBiZSB1c2VkIGFnYWluXHJcbkBwYXJhbSBzZWxlY3Rpb25UeXBlT25lIGludCAtIHRoZSBzZWxlY3Rpb24gbWV0aG9kIGZvciB0aGUgZmlyc3QgcGFyZW50XHJcbkBwYXJhbSBzZWxlY3Rpb25UeXBlVHdvIGludCAtIHRoZSBzZWxlY3Rpb24gbWV0aG9kIGZvciB0aGUgc2Vjb25kIHBhcmVudFxyXG5AcGFyYW0gbWF0ZUluY3JlYXNlU2VsZWN0aW9uTWV0aG9kIGludCAtIHRoZSBzZWxlY3Rpb24gbWV0aG9kIGZvciBjaG9vc2luZyB0aGUgbWF0ZUluY3JlYXNlIHBhcmVudCB3aGljaCB3aWxsIG5vdCBiZSBkZWxldGVkXHJcbkByZXR1cm4gcGFyZW50c1Njb3JlIGludCAtIHJldHVybnMgdGhlIGF2ZXJhZ2Ugc2NvcmUgb2YgdGhlIHBhcmVudHMqL1xyXG5mdW5jdGlvbiBzZWxlY3RQYXJlbnRzKHBhcmVudHMsIHNjb3JlcywgaW5jcmVhc2VNYXRlLCBzZWxlY3Rpb25UeXBlT25lLCBzZWxlY3Rpb25UeXBlVHdvLCBtYXRlSW5jcmVhc2VTZWxlY3Rpb25NZXRob2Qpe1xyXG5cdHZhciBwYXJlbnQxID0gc2VsZWN0aW9uLnJ1blNlbGVjdGlvbihzY29yZXMsKGluY3JlYXNlTWF0ZT09PWZhbHNlKT9zZWxlY3Rpb25UeXBlT25lOm1hdGVJbmNyZWFzZVNlbGVjdGlvbk1ldGhvZCk7XHJcblx0cGFyZW50cy5wdXNoKHBhcmVudDEuZGVmKTtcclxuXHRpZihpbmNyZWFzZU1hdGU9PT1mYWxzZSl7XHJcblx0XHRzY29yZXMuc3BsaWNlKHNjb3Jlcy5maW5kSW5kZXgoeD0+IHguZGVmLmlkPT09cGFyZW50c1swXS5pZCksMSk7XHJcblx0fVxyXG5cdHZhciBwYXJlbnQyID0gc2VsZWN0aW9uLnJ1blNlbGVjdGlvbihzY29yZXMsKGluY3JlYXNlTWF0ZT09PWZhbHNlKT9zZWxlY3Rpb25UeXBlVHdvOm1hdGVJbmNyZWFzZVNlbGVjdGlvbk1ldGhvZCk7XHJcblx0cGFyZW50cy5wdXNoKHBhcmVudDIuZGVmKTtcclxuXHRzY29yZXMuc3BsaWNlKHNjb3Jlcy5maW5kSW5kZXgoeD0+IHguZGVmLmlkPT09cGFyZW50c1sxXS5pZCksMSk7XHJcblx0cmV0dXJuIChwYXJlbnQxLnNjb3JlLnMgKyBwYXJlbnQyLnNjb3JlLnMpLzI7XHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiBydW5zIGEgRXZvbHV0aW9uYXJ5IGFsZ29yaXRobSB3aGljaCB1c2VzIFNlbGVjdGlvbiwgQ3Jvc3NvdmVyIGFuZCBtdXRhdGlvbnMgdG8gY3JlYXRlIHRoZSBuZXcgcG9wdWxhdGlvbnMgb2YgY2Fycy5cclxuQHBhcmFtIHNjb3JlcyBPYmplY3RBcnJheSAtIEFuIGFycmF5IHdoaWNoIGhvbGRzIHRoZSBjYXIgb2JqZWN0cyBhbmQgdGhlcmUgcGVyZm9ybWFuY2Ugc2NvcmVzXHJcbkBwYXJhbSBjb25maWcgLSBUaGlzIGlzIHRoZSBnZW5lcmF0aW9uQ29uZmlnIGZpbGUgcGFzc2VkIHRocm91Z2ggd2hpY2ggZ2l2ZXMgdGhlIGNhcnMgdGVtcGxhdGUvYmx1ZXByaW50IGZvciBjcmVhdGlvblxyXG5AcGFyYW0gbm9DYXJzQ3JlYXRlZCBpbnQgLSBUaGUgbnVtYmVyIG9mIGNhcnMgdGhlcmUgY3VycmVudGx5IGV4aXN0IHVzZWQgZm9yIGNyZWF0aW5nIHRoZSBpZCBvZiBuZXcgY2Fyc1xyXG5AcGFyYW0gc2VsZWN0aW9uVHlwZU9uZSBpbnQgLSB0aGUgc2VsZWN0aW9uIG1ldGhvZCBmb3IgdGhlIGZpcnN0IHBhcmVudFxyXG5AcGFyYW0gc2VsZWN0aW9uVHlwZVR3byBpbnQgLSB0aGUgc2VsZWN0aW9uIG1ldGhvZCBmb3IgdGhlIHNlY29uZCBwYXJlbnRcclxuQHBhcmFtIG11dGF0aW9uVHlwZSBpbnQgLSB0aGUgdHlwZSBvZiBtdXRhdGlvbiB0byBiZSB1c2VkIGVpdGhlciBzaW5nbGUgbXV0YXRpb24gb3IgbXVsdGktbXV0YXRpb25zXHJcbkBwYXJhbSBtYXRlSW5jcmVhc2VTZWxlY3Rpb25NZXRob2QgaW50IC0gdGhlIHNlbGVjdGlvbiBtZXRob2QgZm9yIGNob29zaW5nIHRoZSBtYXRlSW5jcmVhc2UgcGFyZW50IHdoaWNoIHdpbGwgbm90IGJlIGRlbGV0ZWRcclxuQHJldHVybiBuZXdHZW5lcmF0aW9uIE9iamVjdEFycmF5IC0gaXMgcmV0dXJuZWQgd2l0aCBhbGwgdGhlIG5ld2x5IGNyZWF0ZWQgY2FycyB0aGF0IHdpbGwgYmUgaW4gdGhlIHNpbXVsYXRpb24qL1xyXG5mdW5jdGlvbiBydW5FQShzY29yZXMsIGNvbmZpZywgbm9DYXJzQ3JlYXRlZCwgbm9FbGl0ZXMsIGNyb3Nzb3ZlclR5cGUsIG5vTWF0ZUluY3JlYXNlLCBzZWxlY3Rpb25UeXBlT25lLCBzZWxlY3Rpb25UeXBlVHdvLCBtdXRhdGlvblR5cGUsIG1hdGVJbmNyZWFzZVNlbGVjdGlvbk1ldGhvZCwgY2x1c3Qpe1xyXG5cdHNjb3Jlcy5zb3J0KGZ1bmN0aW9uKGEsIGIpe3JldHVybiBiLnNjb3JlLnMgLSBhLnNjb3JlLnM7fSk7XHJcblx0dmFyIGdlbmVyYXRpb25TaXplPXNjb3Jlcy5sZW5ndGg7XHJcblx0dmFyIG5ld0dlbmVyYXRpb24gPSBuZXcgQXJyYXkoKTtcclxuXHR2YXIgbWF4Tm9NYXRlc0luY3JlYXNlcyA9IG5vTWF0ZUluY3JlYXNlO1xyXG5cdHZhciBjdXJyZW50Tm9NYXRlSW5jcmVhc2VzID0gMDtcclxuXHR2YXIgbm9FbGl0ZXM9bm9FbGl0ZXM7XHJcblx0dmFyIHRlbXBDbHVzdDtcclxuXHRpZih0eXBlb2YgY2x1c3QgIT09IFwidW5kZWZpbmVkXCIpe1xyXG5cdFx0aWYoY2x1c3QuYXJyYXlPZkNsdXN0ZXJzWzBdLmRhdGFBcnJheS5sZW5ndGg+Mil7dGVtcENsdXN0PWNsdXN0O31cclxuXHR9XHJcblx0Zm9yKHZhciBpPTA7aTxub0VsaXRlcztpKyspey8vYWRkIG5ldyBlbGl0ZXMgdG8gbmV3R2VuZXJhdGlvblxyXG5cdFx0dmFyIG5ld0VsaXRlID0gc2NvcmVzW2ldLmRlZjtcclxuXHRcdG5ld0VsaXRlLmVsaXRlID0gdHJ1ZTtcclxuXHRcdG5ld0dlbmVyYXRpb24ucHVzaChuZXdFbGl0ZSk7XHJcblx0fVxyXG5cdGZvcih2YXIgayA9IDA7azxnZW5lcmF0aW9uU2l6ZS8yO2srKyl7XHJcblx0XHRpZihuZXdHZW5lcmF0aW9uLmxlbmd0aCE9PWdlbmVyYXRpb25TaXplKXtcclxuXHRcdHZhciBwaWNrZWRQYXJlbnRzID0gW107XHJcblx0XHR2YXIgcGFyZW50c1Njb3JlID0gc2VsZWN0UGFyZW50cyhwaWNrZWRQYXJlbnRzLCBzY29yZXMsIChjdXJyZW50Tm9NYXRlSW5jcmVhc2VzPG1heE5vTWF0ZXNJbmNyZWFzZXMpP3RydWU6ZmFsc2UsIHNlbGVjdGlvblR5cGVPbmUsIHNlbGVjdGlvblR5cGVUd28sIG1hdGVJbmNyZWFzZVNlbGVjdGlvbk1ldGhvZCk7IFxyXG5cdFx0aWYoY3VycmVudE5vTWF0ZUluY3JlYXNlczxtYXhOb01hdGVzSW5jcmVhc2VzKXtjdXJyZW50Tm9NYXRlSW5jcmVhc2VzKys7fVxyXG5cdFx0XHR2YXIgbmV3Q2FycyA9IGNyb3Nzb3Zlci5ydW5Dcm9zc292ZXIocGlja2VkUGFyZW50cywgY3Jvc3NvdmVyVHlwZSxjb25maWcuc2NoZW1hLCBwYXJlbnRzU2NvcmUsIG5vQ2Fyc0NyZWF0ZWQsIChuZXdHZW5lcmF0aW9uLmxlbmd0aD09PWdlbmVyYXRpb25TaXplLTEpPzE6Mik7XHJcblx0XHRcdGZvcih2YXIgaT0wO2k8bmV3Q2Fycy5sZW5ndGg7aSsrKXtcclxuXHRcdFx0XHRuZXdDYXJzW2ldLmVsaXRlID0gZmFsc2U7XHJcblx0XHRcdFx0bmV3Q2Fyc1tpXS5pbmRleCA9IGs7XHJcblx0XHRcdFx0bmV3R2VuZXJhdGlvbi5wdXNoKG5ld0NhcnNbaV0pO1xyXG5cdFx0XHRcdG5vQ2Fyc0NyZWF0ZWQrKzsvLyB1c2VkIGluIGNhciBpZCBjcmVhdGlvblxyXG5cdFx0XHR9XHJcblx0XHR9XHJcblx0fVx0XHJcblx0bmV3R2VuZXJhdGlvbi5zb3J0KGZ1bmN0aW9uKGEsIGIpe3JldHVybiBhLnBhcmVudHNTY29yZSAtIGIucGFyZW50c1Njb3JlO30pO1xyXG5cdGZvcih2YXIgeCA9IDA7eDxuZXdHZW5lcmF0aW9uLmxlbmd0aDt4Kyspe1xyXG5cdFx0XHR2YXIgY3VycmVudElEID0gbmV3R2VuZXJhdGlvblt4XS5pZDtcclxuXHRcdFx0aWYobmV3R2VuZXJhdGlvblt4XS5lbGl0ZT09PWZhbHNlKXtcclxuXHRcdFx0XHRuZXdHZW5lcmF0aW9uW3hdID0gKChtdXRhdGlvblR5cGU9PT0wKXx8KG11dGF0aW9uVHlwZT09PTMpKT9tdXRhdGlvbi5tdXRhdGUobmV3R2VuZXJhdGlvblt4XSwgdGVtcENsdXN0KTptdXRhdGlvbi5tdWx0aU11dGF0aW9ucyhuZXdHZW5lcmF0aW9uW3hdLG5ld0dlbmVyYXRpb24uZmluZEluZGV4KHg9PiB4LmlkPT09Y3VycmVudElEKSwyMCk7XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGNvbnNvbGUubG9nKG5ld0dlbmVyYXRpb24pO1xyXG5cdHJldHVybiBuZXdHZW5lcmF0aW9uO1xyXG59XHJcblxyXG4vKlRoaXMgZnVuY3Rpb24gcnVucyB0aGUgQmFzZWxpbmUgRXZvbHV0aW9uYXJ5IGFsZ29yaXRobSB3aGljaCBvbmx5IHJ1bnMgYSBtdXRhdGlvbiBvciBtdWx0aU11dGF0aW9ucyBvdmVyIGFsbCB0aGUgY2FycyBwYXNzZWQgdGhvdWdoIGluIHRoZSBzY29yZXMgcGFyYW1ldGVyLlxyXG5AcGFyYW0gc2NvcmVzIEFycmF5IC0gVGhpcyBwYXJhbWV0ZXIgaXMgYW4gYXJyYXkgb2YgY2FycyB0aGF0IGhvbGRzIHRoZSBzY29yZSBzdGF0aXN0aWNzIGFuZCBjYXIgZGF0YSBzdWNoIGFzIGlkIGFuZCBcIndoZWVsX3JhZGl1c1wiLCBcImNoYXNzaXNfZGVuc2l0eVwiLCBcInZlcnRleF9saXN0XCIsIFwid2hlZWxfdmVydGV4XCIgYW5kIFwid2hlZWxfZGVuc2l0eVwiXHJcbkBwYXJhbSBjb25maWcgLSBUaGlzIHBhc3NlcyBhIGZpbGUgd2l0aCBmdW5jdGlvbnMgdGhhdCBjYW4gYmUgY2FsbGVkLlxyXG5AcmV0dXJuIG5ld0dlbmVyYXRpb24gLSB0aGlzIGlzIHRoZSBuZXcgcG9wdWxhdGlvbiB0aGF0IGhhdmUgaGFkIG11dGF0aW9ucyBhcHBsaWVkIHRvIHRoZW0uKi9cclxuZnVuY3Rpb24gcnVuQmFzZWxpbmVFQShzY29yZXMsIGNvbmZpZywgY2x1c3Qpe1xyXG5cdHNjb3Jlcy5zb3J0KGZ1bmN0aW9uKGEsIGIpe3JldHVybiBhLnNjb3JlLnMgLSBiLnNjb3JlLnM7fSk7XHJcblx0dmFyIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWE7Ly9saXN0IG9mIGNhciB2YXJpYWJsZXMgaS5lIFwid2hlZWxfcmFkaXVzXCIsIFwiY2hhc3Npc19kZW5zaXR5XCIsIFwidmVydGV4X2xpc3RcIiwgXCJ3aGVlbF92ZXJ0ZXhcIiBhbmQgXCJ3aGVlbF9kZW5zaXR5XCJcclxuXHR2YXIgbmV3R2VuZXJhdGlvbiA9IG5ldyBBcnJheSgpO1xyXG5cdHZhciBnZW5lcmF0aW9uU2l6ZT1zY29yZXMubGVuZ3RoO1xyXG5cdGNvbnNvbGUubG9nKHNjb3Jlcyk7Ly90ZXN0IGRhdGFcclxuXHRmb3IgKHZhciBrID0gMDsgayA8IGdlbmVyYXRpb25TaXplOyBrKyspIHtcclxuXHRcdHZhciB0ZW1wQ2x1c3Q7XHJcblx0XHRpZihjbHVzdC5hcnJheU9mQ2x1c3RlcnNbMF0uZGF0YUFycmF5Lmxlbmd0aD4yKXt0ZW1wQ2x1c3Q9Y2x1c3Q7fVxyXG5cdFx0bmV3R2VuZXJhdGlvbi5wdXNoKG11dGF0aW9uLm11dGF0ZShzY29yZXNba10uZGVmLCB0ZW1wQ2x1c3QpKTtcclxuXHRcdC8vbmV3R2VuZXJhdGlvbi5wdXNoKG11dGF0aW9uLm11dGF0ZShzY29yZXNba10uZGVmKSk7XHJcblx0XHQvL25ld0dlbmVyYXRpb24ucHVzaChtdXRhdGlvbi5tdWx0aU11dGF0aW9ucyhzY29yZXNba10uZGVmLHNjb3Jlcy5maW5kSW5kZXgoeD0+IHguZGVmLmlkPT09c2NvcmVzW2tdLmRlZi5pZCksMjApKTtcclxuXHRcdG5ld0dlbmVyYXRpb25ba10uZWxpdGUgPSBmYWxzZTtcclxuXHRcdG5ld0dlbmVyYXRpb25ba10uaW5kZXggPSBrO1xyXG5cdH1cclxuXHRcclxuXHRyZXR1cm4gbmV3R2VuZXJhdGlvbjtcclxufVx0XHJcblxyXG4vKlxyXG5UaGlzIGZ1bmN0aW9uIGhhbmRsZXMgdGhlIGNob29zaW5nIG9mIHdoaWNoIEV2b2x1dGlvbmFyeSBhbGdvcml0aG0gdG8gcnVuIGFuZCByZXR1cm5zIHRoZSBuZXcgcG9wdWxhdGlvbiB0byB0aGUgc2ltdWxhdGlvbiovXHJcbmZ1bmN0aW9uIG5leHRHZW5lcmF0aW9uKHByZXZpb3VzU3RhdGUsIHNjb3JlcywgY29uZmlnKXtcclxuXHQvLy0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSBTRVQgRVZPTFVUSU9OQVJZIEFMR09SSVRITSBPUEVSQVRPUlMgSEVSRSA8LS0tLS0tLS0tLS0tLS0tXHJcblx0dmFyIG5vRWxpdGVzID0gMDsvL3R5cGUgdGhlIG51bWJlciBvZiBlbGl0ZXMgZm9yIHRoZSBwcm9ncmFtIHRvIHVzZVxyXG5cdHZhciBjcm9zc292ZXJUeXBlPTE7Ly93cml0ZSAxIGZvciBvbmUtcG9pbnQgY3Jvc3NvdmVyIGFueW90aGVyIGZvciB0d28tcG9pbnQgY3Jvc3NvdmVyXHJcblx0dmFyIG5vTWF0ZUluY3JlYXNlPTM7Ly9UaGUgbnVtYmVyIG9mIGNhcnMgdGhhdCBjYW4gbWF0ZSB0d2ljZSBwcm9kdWNpbmcgNCBraWRzIG5vdCAyXHJcblx0dmFyIG1hdGVJbmNyZWFzZVNlbGVjdGlvbk1ldGhvZCA9IDE7Ly8gMSBmb3IgdG91cm5hbWVudCBzZWxlY3Rpb24gdXNpbmcgc3ViLWFycmF5cy8gMiBmb3IgdG91cm5hbWVudCBzZWxlY3Rpb24gdG8gZ2V0IHdlYWtlc3QgY2FyLzMgZm9yIHJvdWxldHRlLXNlbGVjdGlvbi8gNCBmb3IgdW5pZm9ybSByYW5kb20gc2VsZWN0aW9uXHJcblx0Ly8gc2VsZWN0aW9uVHlwZSBmb3Igc2VsZWN0aW9uIHRoZSB0d28gcGFyZW50cyBzZWxlY3Rpb25UeXBlT25lIGZvciB0aGUgZmlyc3Qgc2xlY3Rpb24sIHNlbGVjdGlvblR5cGVUd28gZm9yIHRoZSBzZWNvbmQgcGFyZW50XHJcblx0dmFyIHNlbGVjdGlvblR5cGVPbmUgPSAzOy8vIDEgZm9yIHRvdXJuYW1lbnQgc2VsZWN0aW9uIHVzaW5nIHN1Yi1hcnJheXMvIDIgZm9yIHRvdXJuYW1lbnQgc2VsZWN0aW9uIHRvIGdldCB3ZWFrZXN0IGNhci8zIGZvciByb3VsZXR0ZS1zZWxlY3Rpb24vIDQgZm9yIHVuaWZvcm0gcmFuZG9tIHNlbGVjdGlvblxyXG5cdHZhciBzZWxlY3Rpb25UeXBlVHdvID0gMzsvLyAxIGZvciB0b3VybmFtZW50IHNlbGVjdGlvbiB1c2luZyBzdWItYXJyYXlzLyAyIGZvciB0b3VybmFtZW50IHNlbGVjdGlvbiB0byBnZXQgd2Vha2VzdCBjYXIvMyBmb3Igcm91bGV0dGUtc2VsZWN0aW9uLyA0IGZvciB1bmlmb3JtIHJhbmRvbSBzZWxlY3Rpb25cclxuXHR2YXIgbXV0YXRpb25UeXBlID0wOy8vMCBmb3Igc3RhbmRhcmQgMSBtdXRhdGlvbiB0eXBlIDEgZm9yIG11bHRpLW11dGF0aW9ucywgMyBmb3IgY2x1c3RlciBtdXRhdGlvblxyXG5cdHZhciB1c2VDbHVzdGVyaW5nU2NvcmluZyA9IGZhbHNlO1xyXG5cdC8vLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cclxuXHR2YXIgZ2VuZXJhdGlvblNpemU9c2NvcmVzLmxlbmd0aDtcclxuXHR2YXIgbmV3R2VuZXJhdGlvbiA9IG5ldyBBcnJheSgpO1xyXG5cdHZhciBjb3VudDtcclxuXHR2YXIgdGVtcFJvdW5kPTA7XHJcblx0XHJcblx0dGVtcFJvdW5kPSh0eXBlb2YgcHJldmlvdXNTdGF0ZS5yb3VuZCA9PT1cInVuZGVmaW5lZFwiKT8wOnByZXZpb3VzU3RhdGUucm91bmQ7XHJcblx0Y291bnQgPSBwcmV2aW91c1N0YXRlLmNvdW50ZXIgKyAxO1xyXG5cdHZhciBjbHVzdGVySW50O1xyXG5cdGlmKChtdXRhdGlvblR5cGU9PT0zKXx8KHVzZUNsdXN0ZXJpbmdTY29yaW5nPT09dHJ1ZSkpe1xyXG5cdFx0aWYocHJldmlvdXNTdGF0ZS5jb3VudGVyPT09MCl7XHJcblx0XHRcdGNsdXN0ZXJJbnQ9Y2x1c3Rlci5zZXR1cChzY29yZXMsbnVsbCxmYWxzZSlcclxuXHRcdH1cclxuXHRcdGVsc2V7XHJcblx0XHRcdGNsdXN0ZXJJbnQ9Y2x1c3Rlci5zZXR1cChzY29yZXMscHJldmlvdXNTdGF0ZS5jbHVzdCx0cnVlKVxyXG5cdFx0fVxyXG5cdFx0aWYodXNlQ2x1c3RlcmluZ1Njb3Jpbmc9PT10cnVlKXtcclxuXHRcdGNsdXN0ZXIucmVTY29yZUNhcnMoc2NvcmVzICxjbHVzdGVySW50KTtcclxuXHRcdH1cclxuXHR9XHJcblx0c2NvcmVzLnNvcnQoZnVuY3Rpb24oYSwgYil7cmV0dXJuIGEuc2NvcmUucyAtIGIuc2NvcmUuczt9KTtcclxuXHR2YXIgbnVtYmVyT2ZDYXJzID0gKHByZXZpb3VzU3RhdGUuY291bnRlcj09PTApP2dlbmVyYXRpb25TaXplOnByZXZpb3VzU3RhdGUubm9DYXJzK2dlbmVyYXRpb25TaXplO1xyXG5cdHZhciBzY2hlbWEgPSBjb25maWcuc2NoZW1hOy8vbGlzdCBvZiBjYXIgdmFyaWFibGVzIGkuZSBcIndoZWVsX3JhZGl1c1wiLCBcImNoYXNzaXNfZGVuc2l0eVwiLCBcInZlcnRleF9saXN0XCIsIFwid2hlZWxfdmVydGV4XCJcclxuXHRcclxuXHRjb25zb2xlLmxvZyhcIkxvZyAtLSBcIitwcmV2aW91c1N0YXRlLmNvdW50ZXIpO1xyXG5cdC8vY29uc29sZS5sb2coc2NvcmVzRGF0YSk7Ly90ZXN0IGRhdGFcclxuXHR2YXIgZWFUeXBlID0gMTtcclxuXHRuZXdHZW5lcmF0aW9uID0gKGVhVHlwZT09PTEpP3J1bkVBKHNjb3JlcywgY29uZmlnLCBudW1iZXJPZkNhcnMsIG5vRWxpdGVzLCBjcm9zc292ZXJUeXBlLCBub01hdGVJbmNyZWFzZSwgc2VsZWN0aW9uVHlwZU9uZSwgc2VsZWN0aW9uVHlwZVR3bywgbXV0YXRpb25UeXBlLCBtYXRlSW5jcmVhc2VTZWxlY3Rpb25NZXRob2QsIGNsdXN0ZXJJbnQpOnJ1bkJhc2VsaW5lRUEoc2NvcmVzLCBjb25maWcsY2x1c3RlckludCk7XHJcblx0Ly9jb25zb2xlLmxvZyhuZXdHZW5lcmF0aW9uKTsvL3Rlc3QgZGF0YVxyXG5cdGlmKHByZXZpb3VzU3RhdGUuY291bnRlcj4xNTApe1xyXG5cdFx0Y291bnQ9MDtcclxuXHRcdHRlbXBSb3VuZCsrO1xyXG5cdFx0Ly9uZXdHZW5lcmF0aW9uPWdlbmVyYXRpb25aZXJvKGNvbmZpZykuZ2VuZXJhdGlvbjtcclxuXHRcdFxyXG5cdH1cclxuICByZXR1cm4ge1xyXG4gICAgY291bnRlcjogY291bnQsXHJcbiAgICBnZW5lcmF0aW9uOiBuZXdHZW5lcmF0aW9uLFxyXG5cdGNsdXN0OiBjbHVzdGVySW50LFxyXG5cdG5vQ2FyczogbnVtYmVyT2ZDYXJzLFxyXG5cdHJvdW5kOiB0ZW1wUm91bmRcclxuICB9O1xyXG59XHJcblxyXG5cclxuLy8tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gZW5kIG9mIG15IGNvZGUgam9iNjRcclxuXHJcblxyXG5mdW5jdGlvbiBtYWtlQ2hpbGQoY29uZmlnLCBwYXJlbnRzKXtcclxuICB2YXIgc2NoZW1hID0gY29uZmlnLnNjaGVtYSxcclxuICAgIHBpY2tQYXJlbnQgPSBjb25maWcucGlja1BhcmVudDtcclxuICByZXR1cm4gY3JlYXRlLmNyZWF0ZUNyb3NzQnJlZWQoc2NoZW1hLCBwYXJlbnRzLCBwaWNrUGFyZW50KVxyXG59XHJcblxyXG5cclxuXHJcbmZ1bmN0aW9uIG11dGF0ZShjb25maWcsIHBhcmVudCl7XHJcbiAgdmFyIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWEsXHJcbiAgICBtdXRhdGlvbl9yYW5nZSA9IGNvbmZpZy5tdXRhdGlvbl9yYW5nZSxcclxuICAgIGdlbl9tdXRhdGlvbiA9IGNvbmZpZy5nZW5fbXV0YXRpb24sXHJcbiAgICBnZW5lcmF0ZVJhbmRvbSA9IGNvbmZpZy5nZW5lcmF0ZVJhbmRvbTtcclxuICByZXR1cm4gY3JlYXRlLmNyZWF0ZU11dGF0ZWRDbG9uZShcclxuICAgIHNjaGVtYSxcclxuICAgIGdlbmVyYXRlUmFuZG9tLFxyXG4gICAgcGFyZW50LFxyXG4gICAgTWF0aC5tYXgobXV0YXRpb25fcmFuZ2UpLFxyXG4gICAgZ2VuX211dGF0aW9uXHJcbiAgKVxyXG59XHJcbiIsInZhciBjbHVzdGVyID0gcmVxdWlyZShcIi4vY2x1c3RlcmluZy9jbHVzdGVyU2V0dXAuanMvXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcblx0bXV0YXRlOiBtdXRhdGUsXHJcblx0bXVsdGlNdXRhdGlvbnM6IG11bHRpTXV0YXRpb25zXHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiByZXR1cm5zIHdob2xlIGludHMgYmV0d2VlbiBhIG1pbmltdW0gYW5kIG1heGltdW1cclxuQHBhcmFtIG1pbiBpbnQgLSBUaGUgbWluaW11bSBpbnQgdGhhdCBjYW4gYmUgcmV0dXJuZWRcclxuQHBhcmFtIG1heCBpbnQgLSBUaGUgbWF4aW11bSBpbnQgdGhhdCBjYW4gYmUgcmV0dXJuZWRcclxuQHBhcmFtIG5vdEVxdWFsc0FyciBpbnRBcnJheSAtIEFuIGFycmF5IG9mIHRoZSBpbnRzIHRoYXQgdGhlIGZ1bmN0aW9uIHNob3VsZCBub3QgcmV0dXJuXHJcbkByZXR1cm4gaW50IC0gVGhlIGludCB3aXRoaW4gdGhlIHNwZWNpZmllZCBwYXJhbWV0ZXIgYm91bmRzIGlzIHJldHVybmVkLiovXHJcbmZ1bmN0aW9uIGdldFJhbmRvbUludChtaW4sIG1heCwgbm90RXF1YWxzQXJyKSB7XHJcblx0dmFyIHRvUmV0dXJuO1xyXG5cdHZhciBydW5Mb29wID0gdHJ1ZTtcclxuXHR3aGlsZShydW5Mb29wPT09dHJ1ZSl7XHJcblx0XHRtaW4gPSBNYXRoLmNlaWwobWluKTtcclxuXHRcdG1heCA9IE1hdGguZmxvb3IobWF4KTtcclxuXHRcdHRvUmV0dXJuID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcclxuXHRcdGlmKHR5cGVvZiBub3RFcXVhbHNBcnIgPT09IFwidW5kZWZpbmVkXCIpe1xyXG5cdFx0XHRydW5Mb29wPWZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZihub3RFcXVhbHNBcnIuZmluZChmdW5jdGlvbih2YWx1ZSl7cmV0dXJuIHZhbHVlPT09dG9SZXR1cm47fSkhPT10b1JldHVybil7XHJcblx0XHRcdHJ1bkxvb3A9ZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG4gICAgcmV0dXJuIHRvUmV0dXJuOy8vKHR5cGVvZiBmaW5kSWZFeGlzdHMgPT09IFwidW5kZWZpbmVkXCIpP3RvUmV0dXJuOmdldFJhbmRvbUludChtaW4sIG1heCwgbm90RXF1YWxzQXJyKTtcclxufVxyXG5cclxuXHJcbmZ1bmN0aW9uIGNoYW5nZUFycmF5VmFsdWUoaWQsIG9yaWdpbmFsVmFsdWUsIGNsdXN0LCBkYXRhVHlwZSl7XHJcblx0Zm9yKHZhciBpPTA7aTxvcmlnaW5hbFZhbHVlLmxlbmd0aDtpKyspe1xyXG5cdFx0aWYodHlwZW9mIGNsdXN0ID09PSBcInVuZGVmaW5lZFwiKXtcclxuXHRcdFx0dmFyIHJhbmRvbUZsb2F0ID0gTWF0aC5yYW5kb20oKTtcclxuXHRcdFx0dmFyIG11dGF0aW9uUmF0ZSA9IDAuNSpyYW5kb21GbG9hdDsvL01hdGgucmFuZG9tKCk7XHJcblx0XHRcdHZhciBpbmNyZWFzZU9yRGVjcmVhc2UgPSBnZXRSYW5kb21JbnQoMCwxLFtdKTtcclxuXHRcdFx0bmV3VmFsdWUgPSAoaW5jcmVhc2VPckRlY3JlYXNlPT09MCk/b3JpZ2luYWxWYWx1ZVtpXS1tdXRhdGlvblJhdGU6b3JpZ2luYWxWYWx1ZVtpXSttdXRhdGlvblJhdGU7XHJcblx0XHRcdGlmKG5ld1ZhbHVlPDApe1xyXG5cdFx0XHRcdG5ld1ZhbHVlID0gb3JpZ2luYWxWYWx1ZVtpXSttdXRhdGlvblJhdGU7XHJcblx0XHRcdH0gZWxzZSBpZihuZXdWYWx1ZT4xKXtcclxuXHRcdFx0XHRuZXdWYWx1ZSA9IG9yaWdpbmFsVmFsdWVbaV0tbXV0YXRpb25SYXRlO1xyXG5cdFx0XHR9XHJcblx0XHRcdG9yaWdpbmFsVmFsdWVbaV0gPSBuZXdWYWx1ZTtcclxuXHRcdH0gZWxzZSB7XHJcblx0XHRcdHZhciBuZXdDbHVzdDtcclxuXHRcdFx0Zm9yKHZhciB5PTA7eTxjbHVzdC5hcnJheU9mQ2x1c3RlcnMubGVuZ3RoO3krKyl7XHJcblx0XHRcdFx0aWYoY2x1c3QuYXJyYXlPZkNsdXN0ZXJzW3ldLmlkPT09ZGF0YVR5cGUpe1xyXG5cdFx0XHRcdFx0bmV3Q2x1c3Q9Y2x1c3QuYXJyYXlPZkNsdXN0ZXJzW3ldO1xyXG5cdFx0XHRcdH1cclxuXHRcdFx0fVxyXG5cdFx0XHR2YXIgbmV3VmFsdWUgPSAoY2x1c3Rlci5jbHVzdGVyTXV0YXRlKGlkLG5ld0NsdXN0LmRhdGFBcnJheVtpXS5kYXRhQXJyYXkpLW9yaWdpbmFsVmFsdWVbaV0pKjAuMztcclxuXHRcdFx0b3JpZ2luYWxWYWx1ZVtpXT1vcmdpbmFsVmFsdWVbaV0rbmV3VmFsdWU7XHJcblx0XHR9XHJcblx0fVxyXG5cdHJldHVybiBvcmlnaW5hbFZhbHVlO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtdXRhdGUoY2FyLCBjbHVzdCl7XHJcblx0cmV0dXJuIGNoYW5nZURhdGEoY2FyLG5ldyBBcnJheSgpLDEsIGNsdXN0KTtcclxufVxyXG5cclxuZnVuY3Rpb24gY2hhbmdlRGF0YShjYXIsIG11bHRpTXV0YXRpb25zLCBub011dGF0aW9ucywgY2x1c3Qpe1xyXG5cdHZhciByYW5kb21JbnQgPSBnZXRSYW5kb21JbnQoMCw0LCBtdWx0aU11dGF0aW9ucyk7XHJcblx0aWYocmFuZG9tSW50PT09MSl7XHJcblx0XHRjYXIuY2hhc3Npc19kZW5zaXR5PWNoYW5nZUFycmF5VmFsdWUoY2FyLmlkLCBjYXIuY2hhc3Npc19kZW5zaXR5LCBjbHVzdCwgXCJjaGFzc2lzX2RlbnNpdHlcIik7XHJcblx0fVxyXG5cdGVsc2UgaWYocmFuZG9tSW50PT09Mil7XHJcblx0XHRjYXIudmVydGV4X2xpc3Q9Y2hhbmdlQXJyYXlWYWx1ZShjYXIuaWQsIGNhci52ZXJ0ZXhfbGlzdCwgY2x1c3QsIFwidmVydGV4X2xpc3RcIik7XHJcblx0fVxyXG5cdGVsc2UgaWYocmFuZG9tSW50PT09Myl7XHJcblx0XHRjYXIud2hlZWxfZGVuc2l0eT1jaGFuZ2VBcnJheVZhbHVlKGNhci5pZCwgY2FyLndoZWVsX2RlbnNpdHksIGNsdXN0LCBcIndoZWVsX2RlbnNpdHlcIik7XHJcblx0fVxyXG5cdGVsc2UgaWYocmFuZG9tSW50PT09NCl7XHJcblx0XHRjYXIud2hlZWxfcmFkaXVzPWNoYW5nZUFycmF5VmFsdWUoY2FyLmlkLCBjYXIud2hlZWxfcmFkaXVzLCBjbHVzdCwgXCJ3aGVlbF9yYWRpdXNcIik7XHJcblx0fVxyXG5cdGVsc2Uge1xyXG5cdFx0Y2FyLndoZWVsX3ZlcnRleD1jaGFuZ2VBcnJheVZhbHVlKGNhci5pZCwgY2FyLndoZWVsX3ZlcnRleCwgY2x1c3QsIFwid2hlZWxfdmVydGV4XCIpO1xyXG5cdH1cclxuXHRtdWx0aU11dGF0aW9ucy5wdXNoKHJhbmRvbUludCk7XHJcblx0bm9NdXRhdGlvbnMtLTtcclxuXHRyZXR1cm4gKG5vTXV0YXRpb25zPT09MCk/Y2FyOmNoYW5nZURhdGEoY2FyLCBtdWx0aU11dGF0aW9ucywgbm9NdXRhdGlvbnMpO1xyXG59XHJcblxyXG5mdW5jdGlvbiBtdWx0aU11dGF0aW9ucyhjYXIsIGFyclBvc2l0aW9uLCBhcnJTaXplKXtcclxuXHQvL3ZhciBub011dGF0aW9ucyA9IChhcnJQb3NpdGlvbjwoYXJyU2l6ZS8yKSk/KGFyclBvc2l0aW9uPChhcnJTaXplLzQpKT80OjM6KGFyclBvc2l0aW9uPmFyclNpemUtKGFyclNpemUvNCkpPzE6MjtcclxuXHR2YXIgbm9NdXRhdGlvbnMgPSAoYXJyUG9zaXRpb248MTApPzM6MTtcclxuXHRyZXR1cm4gY2hhbmdlRGF0YShjYXIsIG5ldyBBcnJheSgpLG5vTXV0YXRpb25zKTtcclxufSIsIiBtb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRnZXRSYW5kb21JbnQ6IGdldFJhbmRvbUludFxyXG4gfVxyXG4gXHJcbi8qVGhpcyBmdW5jdGlvbiByZXR1cm5zIHdob2xlIGludHMgYmV0d2VlbiBhIG1pbmltdW0gYW5kIG1heGltdW1cclxuQHBhcmFtIG1pbiBpbnQgLSBUaGUgbWluaW11bSBpbnQgdGhhdCBjYW4gYmUgcmV0dXJuZWRcclxuQHBhcmFtIG1heCBpbnQgLSBUaGUgbWF4aW11bSBpbnQgdGhhdCBjYW4gYmUgcmV0dXJuZWRcclxuQHBhcmFtIG5vdEVxdWFsc0FyciBpbnRBcnJheSAtIEFuIGFycmF5IG9mIHRoZSBpbnRzIHRoYXQgdGhlIGZ1bmN0aW9uIHNob3VsZCBub3QgcmV0dXJuXHJcbkByZXR1cm4gaW50IC0gVGhlIGludCB3aXRoaW4gdGhlIHNwZWNpZmllZCBwYXJhbWV0ZXIgYm91bmRzIGlzIHJldHVybmVkLiovXHJcbmZ1bmN0aW9uIGdldFJhbmRvbUludChtaW4sIG1heCwgbm90RXF1YWxzQXJyKSB7XHJcblx0dmFyIHRvUmV0dXJuO1xyXG5cdHZhciBydW5Mb29wID0gdHJ1ZTtcclxuXHR3aGlsZShydW5Mb29wPT09dHJ1ZSl7XHJcblx0XHRtaW4gPSBNYXRoLmNlaWwobWluKTtcclxuXHRcdG1heCA9IE1hdGguZmxvb3IobWF4KTtcclxuXHRcdHRvUmV0dXJuID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcclxuXHRcdGlmKHR5cGVvZiBub3RFcXVhbHNBcnIgPT09IFwidW5kZWZpbmVkXCIpe1xyXG5cdFx0XHRydW5Mb29wPWZhbHNlO1xyXG5cdFx0fVxyXG5cdFx0ZWxzZSBpZihub3RFcXVhbHNBcnIuZmluZChmdW5jdGlvbih2YWx1ZSl7cmV0dXJuIHZhbHVlPT09dG9SZXR1cm47fSkhPT10b1JldHVybil7XHJcblx0XHRcdHJ1bkxvb3A9ZmFsc2U7XHJcblx0XHR9XHJcblx0fVxyXG4gICAgcmV0dXJuIHRvUmV0dXJuOy8vKHR5cGVvZiBmaW5kSWZFeGlzdHMgPT09IFwidW5kZWZpbmVkXCIpP3RvUmV0dXJuOmdldFJhbmRvbUludChtaW4sIG1heCwgbm90RXF1YWxzQXJyKTtcclxufSIsIi8vdmFyIHJhbmRvbUludCA9IHJlcXVpcmUoXCIuL3JhbmRvbUludC5qcy9cIik7XHJcbi8vdmFyIGdldFJhbmRvbUludCA9IHJhbmRvbUludC5nZXRSYW5kb21JbnQ7XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IHtcclxuXHRydW5TZWxlY3Rpb246IHJ1blNlbGVjdGlvblxyXG59XHJcbi8qXHJcblRoaXMgZnVuY3Rpb24gY2hhbmdlcyB0aGUgdHlwZSBvZiBzZWxlY3Rpb24gdXNlZCBkZXBlbmRpbmcgb24gdGhlIHBhcmFtZXRlciBudW1iZXIgXCJzZWxlY3RUeXBlXCIgPSAocm91bGV0ZVdoZWVsU2VsIC0gMSwgdG91cm5hbWVudFNlbGVjdGlvbiAtIDIpXHJcbkBwYXJhbSBzZWxlY3RUeXBlIGludCAtIHRoaXMgcGFyYW1ldGVyIGRldGVybWluZXMgdGhlIHR5cGUgb2Ygc2VsZWN0aW9uIHVzZWQgLSAxIGZvciB0b3VybmFtZW50IHNlbGVjdGlvbiB1c2luZyBzdWItYXJyYXlzLyAyIGZvciB0b3VybmFtZW50IHNlbGVjdGlvbiB0byBnZXQgd2Vha2VzdCBjYXIvMyBmb3Igcm91bGV0dGUtc2VsZWN0aW9uLyA0IGZvciB1bmlmb3JtIHJhbmRvbSBzZWxlY3Rpb24uXHJcbkBwYXJhbSBjYXJzQXJyIEFycmF5IC0gdGhpcyBwYXJhbWV0ZXIgaXMgdGhlIHBvcHVsYXRpb24gd2hpY2ggdGhlIHNlbGVjdGlvbiBmdW5jdGlvbnMgYXJlIHVzZWQgb24uXHJcbkByZXR1cm4gT2JqZWN0QXJyYXkgLSB0aGUgcGFyZW50cyBhcnJheSBvZiB0d28gaXMgcmV0dXJuZWQgZnJvbSBlaXRoZXIgdG91cm5hbWVudCBvciByb3VsbGV0ZSB3aGVlbCBzZWxlY3Rpb24qL1xyXG5mdW5jdGlvbiBydW5TZWxlY3Rpb24oY2Fyc0Fyciwgc2VsZWN0VHlwZSl7XHJcblx0Ly8gU2VsZWN0VHlwZSAtIDEgZm9yIHRvdXJuYW1lbnQgc2VsZWN0aW9uIHVzaW5nIHN1Yi1hcnJheXMvIDIgZm9yIHRvdXJuYW1lbnQgc2VsZWN0aW9uIHRvIGdldCB3ZWFrZXN0IGNhci8zIGZvciByb3VsZXR0ZS1zZWxlY3Rpb24vIDQgZm9yIHVuaWZvcm0gcmFuZG9tIHNlbGVjdGlvblxyXG5cdHZhciBzdHJvbmdlc3QgPSAoc2VsZWN0VHlwZT09PTEpP3RydWU6ZmFsc2U7XHJcblx0dmFyIHVzZVN1YlNldCA9ICgoc2VsZWN0VHlwZT09PTEpfHwoc2VsZWN0VHlwZT09PTIpKT90cnVlOmZhbHNlO1xyXG5cdHZhciB1bmlmb3JtID0gKHNlbGVjdFR5cGU9PT00KT90cnVlOmZhbHNlO1xyXG5cdGlmKChzZWxlY3RUeXBlPT09Myl8fChzZWxlY3RUeXBlPT09NCkpe1xyXG5cdFx0cmV0dXJuIHJvdWxldGVXaGVlbFNlbChjYXJzQXJyLCB1bmlmb3JtKTtcclxuXHR9IFxyXG5cdGVsc2UgaWYoKHNlbGVjdFR5cGU9PT0xKXx8c2VsZWN0VHlwZT09PTIpe1xyXG5cdFx0cmV0dXJuIHRvdXJuYW1lbnRTZWxlY3Rpb24oY2Fyc0FycixzdHJvbmdlc3QsY2Fyc0Fyci5sZW5ndGgvNCwgdXNlU3ViU2V0KTtcclxuXHR9XHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiB1c2VzIGZpbmVzcyBwcm9wb3J0aW9uYXRlIHNlbGVjdGlvbiB3aGVyZSBhIHByb3BvcnRpb24gb2YgdGhlIHdoZWVsIGlzIGdpdmVuIHRvIGEgY2FyIGJhc2VkIG9uIGZpdG5lc3NcclxuQHBhcmFtIGNhcnNBcnIgT2JqZWN0QXJyYXkgLSBUaGUgYXJyYXkgb2YgY2FycyB3aGVyZSB0aGUgcGFyZW50cyBhcmUgY2hvc2VuIGZyb21cclxuQHBhcmFtIHVuaWZvcm0gYm9vbGVhbiAtIHdoZXRoZXIgdGhlIHNlbGVjdGlvbiBzaG91bGQgYmUgdW5pZm9ybVxyXG5AcmV0dXJuIGNhciBPYmplY3QgLSBBIGNhciBvYmplY3QgaXMgcmV0dXJuZWQgYWZ0ZXIgc2VsZWN0aW9uKi9cclxuZnVuY3Rpb24gcm91bGV0ZVdoZWVsU2VsKGNhcnNBcnIsIHVuaWZvcm0pe1xyXG5cdGlmKHVuaWZvcm0gPT09ZmFsc2Upe1xyXG5cdFx0dmFyIHN1bUNhclNjb3JlID0gMDtcclxuXHRcdGZvcih2YXIgaSA9MDtpPGNhcnNBcnIubGVuZ3RoO2krKyl7XHJcblx0XHRcdHN1bUNhclNjb3JlICs9IGNhcnNBcnJbaV0uc2NvcmUucztcclxuXHRcdH1cclxuXHRcdC8qY29uc29sZS5sb2coXCJzZWxlY3Rpb24gZGF0YSAtXCIpO1xyXG5cdFx0Y29uc29sZS5sb2coY2Fyc0Fyci5sZW5ndGgpO1xyXG5cdFx0Y29uc29sZS5sb2coc3VtQ2FyU2NvcmUpOy8vdGVzdCBub1xyXG5cdFx0Ki9cclxuXHRcdHZhciBubyA9IE1hdGgucmFuZG9tKCkgKiBzdW1DYXJTY29yZTtcclxuXHRcdGlmKHN1bUNhclNjb3JlIT0wKXtcclxuXHRcdFx0Zm9yKHZhciB4ID0wO3g8Y2Fyc0Fyci5sZW5ndGg7eCsrKXtcclxuXHRcdFx0XHRubyAtPSBjYXJzQXJyW3hdLnNjb3JlLnM7XHJcblx0XHRcdFx0aWYobm88MCl7XHJcblx0XHRcdFx0XHQvL2NvbnNvbGUubG9nKGNhcnNBcnJbeF0pOy8vcmV0dXJuZWQgY2FyXHJcblx0XHRcdFx0XHRyZXR1cm4gY2Fyc0Fyclt4XTtcclxuXHRcdFx0XHR9XHJcblx0XHRcdFx0XHJcblx0XHRcdH1cclxuXHRcdH1cclxuXHRcdGVsc2V7XHJcblx0XHRcdHJldHVybiBjYXJzQXJyWzBdO1xyXG5cdFx0fVxyXG5cdH0gZWxzZSB7XHJcblx0XHR2YXIgcmFuZE5vID0gZ2V0UmFuZG9tSW50KDAsIGNhcnNBcnIubGVuZ3RoLTEsW10pO1xyXG5cdFx0cmV0dXJuIGNhcnNBcnJbcmFuZE5vXTtcclxuXHR9XHJcbn1cclxuXHJcbi8qVGhpcyBmdW5jdGlvbiB1c2VzIHRvdXJuYW1lbnRTZWxlY3Rpb24gd2hlcmUgYSBhcnJheSBpcyBzb3J0ZWQgYW5kIHRoZSBzdHJvbmdlc3Qgb3Igd2Vha2VzdCBpcyByZXR1cm5lZFxyXG5AcGFyYW0gY2Fyc0FyciBPYmplY3RBcnJheSAtIFRoZSBhcnJheSBvZiBjYXJzIHdoZXJlIHRoZSBwYXJlbnRzIGFyZSBjaG9zZW4gZnJvbVxyXG5AcGFyYW0gc3Ryb25nZXN0IEJvb2xlYW4gLSBpZiB0cnVlIHRoZSBzdHJvbmdlc3QgY2FyIGlzIGNob3NlbiwgZWxzZSBpZiBmYWxzZSB0aGUgd2Vha2VzdCBpcyByZXR1cm5lZCBcclxuQHBhcmFtIHN1YlNldFJhbmdlIGludCAtIEhvdyBiaWcgdGhlIHN1YlNldCBvZiB0aGUgZ2xvYmFsIGFycmF5IHNob3VsZCBiZVxyXG5AcGFyYW0gdXNlU3ViU2V0IGJvb2xlYW4gLSB0cnVlIGlmIHlvdSB3YW50IHRvIHVzZSBzdWIgc2V0IG9mIHJhbmRvbWx5IGNob3NlbiBvYmplY3RzIGZyb20gdGhlIGdsb2JhbCwgb3IgZmFsc2UgdG8ganVzdCB1c2UgdGhlIGdsb2JhbFxyXG5AcmV0dXJuIGNhciBPYmplY3QgLSBBIGNhciBvYmplY3QgaXMgcmV0dXJuZWQgYWZ0ZXIgc2VsZWN0aW9uKi9cclxuZnVuY3Rpb24gdG91cm5hbWVudFNlbGVjdGlvbihjYXJzQXJyLCBzdHJvbmdlc3QsIHN1YlNldFJhbmdlLCB1c2VTdWJTZXQpe1xyXG5cdHZhciBzdWJTZXQgPSBbXTtcclxuXHRpZih1c2VTdWJTZXQ9PT10cnVlKXtcclxuXHR2YXIgY2hvc2VuSW50cyA9IFtdO1xyXG5cdGZvcih2YXIgaSA9MDtpPHN1YlNldFJhbmdlO2krKyl7XHJcblx0XHR2YXIgY2hvc2VuTm8gPSBnZXRSYW5kb21JbnQoMCxjYXJzQXJyLmxlbmd0aC0xLGNob3NlbkludHMpO1xyXG5cdFx0Y2hvc2VuSW50cy5wdXNoKGNob3Nlbk5vKTtcclxuXHRcdHN1YlNldC5wdXNoKGNhcnNBcnJbY2hvc2VuTm9dKTtcclxuXHR9XHJcblx0fVxyXG5cdGlmKHVzZVN1YlNldD09PXRydWUpe1xyXG5cdFx0c3ViU2V0LnNvcnQoZnVuY3Rpb24oYSxiKXtyZXR1cm4gKHN0cm9uZ2VzdD09PXRydWUpP2Iuc2NvcmUucyAtIGEuc2NvcmUuczphLnNjb3JlLnMgLSBiLnNjb3JlLnM7fSk7XHJcblx0fSBlbHNlIHtcclxuXHRcdGNhcnNBcnIuc29ydChmdW5jdGlvbihhLGIpe3JldHVybiAoc3Ryb25nZXN0PT09dHJ1ZSk/Yi5zY29yZS5zIC0gYS5zY29yZS5zOmEuc2NvcmUucyAtIGIuc2NvcmUuczt9KTtcclxuXHR9XHJcblx0cmV0dXJuICh1c2VTdWJTZXQ9PT10cnVlKT9zdWJTZXRbMF06Y2Fyc0FyclswXTtcclxufVxyXG5cclxuLypUaGlzIGZ1bmN0aW9uIHJldHVybnMgd2hvbGUgaW50cyBiZXR3ZWVuIGEgbWluaW11bSBhbmQgbWF4aW11bVxyXG5AcGFyYW0gbWluIGludCAtIFRoZSBtaW5pbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbWF4IGludCAtIFRoZSBtYXhpbXVtIGludCB0aGF0IGNhbiBiZSByZXR1cm5lZFxyXG5AcGFyYW0gbm90RXF1YWxzQXJyIGludEFycmF5IC0gQW4gYXJyYXkgb2YgdGhlIGludHMgdGhhdCB0aGUgZnVuY3Rpb24gc2hvdWxkIG5vdCByZXR1cm5cclxuQHJldHVybiBpbnQgLSBUaGUgaW50IHdpdGhpbiB0aGUgc3BlY2lmaWVkIHBhcmFtZXRlciBib3VuZHMgaXMgcmV0dXJuZWQuKi9cclxuZnVuY3Rpb24gZ2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpIHtcclxuXHR2YXIgdG9SZXR1cm47XHJcblx0dmFyIHJ1bkxvb3AgPSB0cnVlO1xyXG5cdHdoaWxlKHJ1bkxvb3A9PT10cnVlKXtcclxuXHRcdG1pbiA9IE1hdGguY2VpbChtaW4pO1xyXG5cdFx0bWF4ID0gTWF0aC5mbG9vcihtYXgpO1xyXG5cdFx0dG9SZXR1cm4gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4IC0gbWluICsgMSkpICsgbWluO1xyXG5cdFx0aWYodHlwZW9mIG5vdEVxdWFsc0FyciA9PT0gXCJ1bmRlZmluZWRcIil7XHJcblx0XHRcdHJ1bkxvb3A9ZmFsc2U7XHJcblx0XHR9XHJcblx0XHRlbHNlIGlmKG5vdEVxdWFsc0Fyci5maW5kKGZ1bmN0aW9uKHZhbHVlKXtyZXR1cm4gdmFsdWU9PT10b1JldHVybjt9KSE9PXRvUmV0dXJuKXtcclxuXHRcdFx0cnVuTG9vcD1mYWxzZTtcclxuXHRcdH1cclxuXHR9XHJcbiAgICByZXR1cm4gdG9SZXR1cm47Ly8odHlwZW9mIGZpbmRJZkV4aXN0cyA9PT0gXCJ1bmRlZmluZWRcIik/dG9SZXR1cm46Z2V0UmFuZG9tSW50KG1pbiwgbWF4LCBub3RFcXVhbHNBcnIpO1xyXG59XHJcblxyXG4iLCJcclxuXHJcbmNvbnN0IHJhbmRvbSA9IHtcclxuICBzaHVmZmxlSW50ZWdlcnMocHJvcCwgZ2VuZXJhdG9yKXtcclxuICAgIHJldHVybiByYW5kb20ubWFwVG9TaHVmZmxlKHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcclxuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aCB8fCAxMCxcclxuICAgICAgaW5jbHVzaXZlOiB0cnVlLFxyXG4gICAgfSwgZ2VuZXJhdG9yKSk7XHJcbiAgfSxcclxuICBjcmVhdGVJbnRlZ2Vycyhwcm9wLCBnZW5lcmF0b3Ipe1xyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0ludGVnZXIocHJvcCwgcmFuZG9tLmNyZWF0ZU5vcm1hbHMoe1xyXG4gICAgICBsZW5ndGg6IHByb3AubGVuZ3RoLFxyXG4gICAgICBpbmNsdXNpdmU6IHRydWUsXHJcbiAgICB9LCBnZW5lcmF0b3IpKTtcclxuICB9LFxyXG4gIGNyZWF0ZUZsb2F0cyhwcm9wLCBnZW5lcmF0b3Ipe1xyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0Zsb2F0KHByb3AsIHJhbmRvbS5jcmVhdGVOb3JtYWxzKHtcclxuICAgICAgbGVuZ3RoOiBwcm9wLmxlbmd0aCxcclxuICAgICAgaW5jbHVzaXZlOiB0cnVlLFxyXG4gICAgfSwgZ2VuZXJhdG9yKSk7XHJcbiAgfSxcclxuICBjcmVhdGVOb3JtYWxzKHByb3AsIGdlbmVyYXRvcil7XHJcbiAgICB2YXIgbCA9IHByb3AubGVuZ3RoO1xyXG4gICAgdmFyIHZhbHVlcyA9IFtdO1xyXG4gICAgZm9yKHZhciBpID0gMDsgaSA8IGw7IGkrKyl7XHJcbiAgICAgIHZhbHVlcy5wdXNoKFxyXG4gICAgICAgIGNyZWF0ZU5vcm1hbChwcm9wLCBnZW5lcmF0b3IpXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdmFsdWVzO1xyXG4gIH0sXHJcbiAgbXV0YXRlU2h1ZmZsZShcclxuICAgIHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZVxyXG4gICl7XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvU2h1ZmZsZShwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcclxuICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlXHJcbiAgICApKTtcclxuICB9LFxyXG4gIG11dGF0ZUludGVnZXJzKHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZSl7XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvSW50ZWdlcihwcm9wLCByYW5kb20ubXV0YXRlTm9ybWFscyhcclxuICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlcywgbXV0YXRpb25fcmFuZ2UsIGNoYW5jZVRvTXV0YXRlXHJcbiAgICApKTtcclxuICB9LFxyXG4gIG11dGF0ZUZsb2F0cyhwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGUpe1xyXG4gICAgcmV0dXJuIHJhbmRvbS5tYXBUb0Zsb2F0KHByb3AsIHJhbmRvbS5tdXRhdGVOb3JtYWxzKFxyXG4gICAgICBwcm9wLCBnZW5lcmF0b3IsIG9yaWdpbmFsVmFsdWVzLCBtdXRhdGlvbl9yYW5nZSwgY2hhbmNlVG9NdXRhdGVcclxuICAgICkpO1xyXG4gIH0sXHJcbiAgbWFwVG9TaHVmZmxlKHByb3AsIG5vcm1hbHMpe1xyXG4gICAgdmFyIG9mZnNldCA9IHByb3Aub2Zmc2V0IHx8IDA7XHJcbiAgICB2YXIgbGltaXQgPSBwcm9wLmxpbWl0IHx8IHByb3AubGVuZ3RoO1xyXG4gICAgdmFyIHNvcnRlZCA9IG5vcm1hbHMuc2xpY2UoKS5zb3J0KGZ1bmN0aW9uKGEsIGIpe1xyXG4gICAgICByZXR1cm4gYSAtIGI7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiBub3JtYWxzLm1hcChmdW5jdGlvbih2YWwpe1xyXG4gICAgICByZXR1cm4gc29ydGVkLmluZGV4T2YodmFsKTtcclxuICAgIH0pLm1hcChmdW5jdGlvbihpKXtcclxuICAgICAgcmV0dXJuIGkgKyBvZmZzZXQ7XHJcbiAgICB9KS5zbGljZSgwLCBsaW1pdCk7XHJcbiAgfSxcclxuICBtYXBUb0ludGVnZXIocHJvcCwgbm9ybWFscyl7XHJcbiAgICBwcm9wID0ge1xyXG4gICAgICBtaW46IHByb3AubWluIHx8IDAsXHJcbiAgICAgIHJhbmdlOiBwcm9wLnJhbmdlIHx8IDEwLFxyXG4gICAgICBsZW5ndGg6IHByb3AubGVuZ3RoXHJcbiAgICB9XHJcbiAgICByZXR1cm4gcmFuZG9tLm1hcFRvRmxvYXQocHJvcCwgbm9ybWFscykubWFwKGZ1bmN0aW9uKGZsb2F0KXtcclxuICAgICAgcmV0dXJuIE1hdGgucm91bmQoZmxvYXQpO1xyXG4gICAgfSk7XHJcbiAgfSxcclxuICBtYXBUb0Zsb2F0KHByb3AsIG5vcm1hbHMpe1xyXG4gICAgcHJvcCA9IHtcclxuICAgICAgbWluOiBwcm9wLm1pbiB8fCAwLFxyXG4gICAgICByYW5nZTogcHJvcC5yYW5nZSB8fCAxXHJcbiAgICB9XHJcbiAgICByZXR1cm4gbm9ybWFscy5tYXAoZnVuY3Rpb24obm9ybWFsKXtcclxuICAgICAgdmFyIG1pbiA9IHByb3AubWluO1xyXG4gICAgICB2YXIgcmFuZ2UgPSBwcm9wLnJhbmdlO1xyXG4gICAgICByZXR1cm4gbWluICsgbm9ybWFsICogcmFuZ2VcclxuICAgIH0pXHJcbiAgfSxcclxuICBtdXRhdGVOb3JtYWxzKHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZXMsIG11dGF0aW9uX3JhbmdlLCBjaGFuY2VUb011dGF0ZSl7XHJcbiAgICB2YXIgZmFjdG9yID0gKHByb3AuZmFjdG9yIHx8IDEpICogbXV0YXRpb25fcmFuZ2VcclxuICAgIHJldHVybiBvcmlnaW5hbFZhbHVlcy5tYXAoZnVuY3Rpb24ob3JpZ2luYWxWYWx1ZSl7XHJcbiAgICAgIGlmKGdlbmVyYXRvcigpID4gY2hhbmNlVG9NdXRhdGUpe1xyXG4gICAgICAgIHJldHVybiBvcmlnaW5hbFZhbHVlO1xyXG4gICAgICB9XHJcbiAgICAgIHJldHVybiBtdXRhdGVOb3JtYWwoXHJcbiAgICAgICAgcHJvcCwgZ2VuZXJhdG9yLCBvcmlnaW5hbFZhbHVlLCBmYWN0b3JcclxuICAgICAgKTtcclxuICAgIH0pO1xyXG4gIH1cclxufTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gcmFuZG9tO1xyXG5cclxuZnVuY3Rpb24gbXV0YXRlTm9ybWFsKHByb3AsIGdlbmVyYXRvciwgb3JpZ2luYWxWYWx1ZSwgbXV0YXRpb25fcmFuZ2Upe1xyXG4gIGlmKG11dGF0aW9uX3JhbmdlID4gMSl7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgbXV0YXRlIGJleW9uZCBib3VuZHNcIik7XHJcbiAgfVxyXG4gIHZhciBuZXdNaW4gPSBvcmlnaW5hbFZhbHVlIC0gMC41O1xyXG4gIGlmIChuZXdNaW4gPCAwKSBuZXdNaW4gPSAwO1xyXG4gIGlmIChuZXdNaW4gKyBtdXRhdGlvbl9yYW5nZSAgPiAxKVxyXG4gICAgbmV3TWluID0gMSAtIG11dGF0aW9uX3JhbmdlO1xyXG4gIHZhciByYW5nZVZhbHVlID0gY3JlYXRlTm9ybWFsKHtcclxuICAgIGluY2x1c2l2ZTogdHJ1ZSxcclxuICB9LCBnZW5lcmF0b3IpO1xyXG4gIHJldHVybiBuZXdNaW4gKyByYW5nZVZhbHVlICogbXV0YXRpb25fcmFuZ2U7XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGNyZWF0ZU5vcm1hbChwcm9wLCBnZW5lcmF0b3Ipe1xyXG4gIGlmKCFwcm9wLmluY2x1c2l2ZSl7XHJcbiAgICByZXR1cm4gZ2VuZXJhdG9yKCk7XHJcbiAgfSBlbHNlIHtcclxuICAgIHJldHVybiBnZW5lcmF0b3IoKSA8IDAuNSA/XHJcbiAgICBnZW5lcmF0b3IoKSA6XHJcbiAgICAxIC0gZ2VuZXJhdG9yKCk7XHJcbiAgfVxyXG59XHJcbiIsInZhciBjcmVhdGUgPSByZXF1aXJlKFwiLi4vY3JlYXRlLWluc3RhbmNlXCIpO1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSB7XHJcbiAgZ2VuZXJhdGlvblplcm86IGdlbmVyYXRpb25aZXJvLFxyXG4gIG5leHRHZW5lcmF0aW9uOiBuZXh0R2VuZXJhdGlvbixcclxufVxyXG5cclxuZnVuY3Rpb24gZ2VuZXJhdGlvblplcm8oY29uZmlnKXtcclxuICB2YXIgb2xkU3RydWN0dXJlID0gY3JlYXRlLmNyZWF0ZUdlbmVyYXRpb25aZXJvKFxyXG4gICAgY29uZmlnLnNjaGVtYSwgY29uZmlnLmdlbmVyYXRlUmFuZG9tXHJcbiAgKTtcclxuICB2YXIgbmV3U3RydWN0dXJlID0gY3JlYXRlU3RydWN0dXJlKGNvbmZpZywgMSwgb2xkU3RydWN0dXJlKTtcclxuXHJcbiAgdmFyIGsgPSAwO1xyXG5cclxuICByZXR1cm4ge1xyXG4gICAgY291bnRlcjogMCxcclxuICAgIGs6IGssXHJcbiAgICBnZW5lcmF0aW9uOiBbbmV3U3RydWN0dXJlLCBvbGRTdHJ1Y3R1cmVdXHJcbiAgfVxyXG59XHJcblxyXG5mdW5jdGlvbiBuZXh0R2VuZXJhdGlvbihwcmV2aW91c1N0YXRlLCBzY29yZXMsIGNvbmZpZyl7XHJcbiAgdmFyIG5leHRTdGF0ZSA9IHtcclxuICAgIGs6IChwcmV2aW91c1N0YXRlLmsgKyAxKSVjb25maWcuZ2VuZXJhdGlvblNpemUsXHJcbiAgICBjb3VudGVyOiBwcmV2aW91c1N0YXRlLmNvdW50ZXIgKyAocHJldmlvdXNTdGF0ZS5rID09PSBjb25maWcuZ2VuZXJhdGlvblNpemUgPyAxIDogMClcclxuICB9O1xyXG4gIC8vIGdyYWR1YWxseSBnZXQgY2xvc2VyIHRvIHplcm8gdGVtcGVyYXR1cmUgKGJ1dCBuZXZlciBoaXQgaXQpXHJcbiAgdmFyIG9sZERlZiA9IHByZXZpb3VzU3RhdGUuY3VyRGVmIHx8IHByZXZpb3VzU3RhdGUuZ2VuZXJhdGlvblsxXTtcclxuICB2YXIgb2xkU2NvcmUgPSBwcmV2aW91c1N0YXRlLnNjb3JlIHx8IHNjb3Jlc1sxXS5zY29yZS52O1xyXG5cclxuICB2YXIgbmV3RGVmID0gcHJldmlvdXNTdGF0ZS5nZW5lcmF0aW9uWzBdO1xyXG4gIHZhciBuZXdTY29yZSA9IHNjb3Jlc1swXS5zY29yZS52O1xyXG5cclxuXHJcbiAgdmFyIHRlbXAgPSBNYXRoLnBvdyhNYXRoLkUsIC1uZXh0U3RhdGUuY291bnRlciAvIGNvbmZpZy5nZW5lcmF0aW9uU2l6ZSk7XHJcblxyXG4gIHZhciBzY29yZURpZmYgPSBuZXdTY29yZSAtIG9sZFNjb3JlO1xyXG4gIC8vIElmIHRoZSBuZXh0IHBvaW50IGlzIGhpZ2hlciwgY2hhbmdlIGxvY2F0aW9uXHJcbiAgaWYoc2NvcmVEaWZmID4gMCl7XHJcbiAgICBuZXh0U3RhdGUuY3VyRGVmID0gbmV3RGVmO1xyXG4gICAgbmV4dFN0YXRlLnNjb3JlID0gbmV3U2NvcmU7XHJcbiAgICAvLyBFbHNlIHdlIHdhbnQgdG8gaW5jcmVhc2UgbGlrZWx5aG9vZCBvZiBjaGFuZ2luZyBsb2NhdGlvbiBhcyB3ZSBnZXRcclxuICB9IGVsc2UgaWYoTWF0aC5yYW5kb20oKSA+IE1hdGguZXhwKC1zY29yZURpZmYvKG5leHRTdGF0ZS5rICogdGVtcCkpKXtcclxuICAgIG5leHRTdGF0ZS5jdXJEZWYgPSBuZXdEZWY7XHJcbiAgICBuZXh0U3RhdGUuc2NvcmUgPSBuZXdTY29yZTtcclxuICB9IGVsc2Uge1xyXG4gICAgbmV4dFN0YXRlLmN1ckRlZiA9IG9sZERlZjtcclxuICAgIG5leHRTdGF0ZS5zY29yZSA9IG9sZFNjb3JlO1xyXG4gIH1cclxuXHJcbiAgY29uc29sZS5sb2cocHJldmlvdXNTdGF0ZSwgbmV4dFN0YXRlKTtcclxuXHJcbiAgbmV4dFN0YXRlLmdlbmVyYXRpb24gPSBbY3JlYXRlU3RydWN0dXJlKGNvbmZpZywgdGVtcCwgbmV4dFN0YXRlLmN1ckRlZildO1xyXG5cclxuICByZXR1cm4gbmV4dFN0YXRlO1xyXG59XHJcblxyXG5cclxuZnVuY3Rpb24gY3JlYXRlU3RydWN0dXJlKGNvbmZpZywgbXV0YXRpb25fcmFuZ2UsIHBhcmVudCl7XHJcbiAgdmFyIHNjaGVtYSA9IGNvbmZpZy5zY2hlbWEsXHJcbiAgICBnZW5fbXV0YXRpb24gPSAxLFxyXG4gICAgZ2VuZXJhdGVSYW5kb20gPSBjb25maWcuZ2VuZXJhdGVSYW5kb207XHJcbiAgcmV0dXJuIGNyZWF0ZS5jcmVhdGVNdXRhdGVkQ2xvbmUoXHJcbiAgICBzY2hlbWEsXHJcbiAgICBnZW5lcmF0ZVJhbmRvbSxcclxuICAgIHBhcmVudCxcclxuICAgIG11dGF0aW9uX3JhbmdlLFxyXG4gICAgZ2VuX211dGF0aW9uXHJcbiAgKVxyXG5cclxufVxyXG4iLCIvKiBnbG9iYWxzIGJ0b2EgKi9cclxudmFyIHNldHVwU2NlbmUgPSByZXF1aXJlKFwiLi9zZXR1cC1zY2VuZVwiKTtcclxudmFyIGNhclJ1biA9IHJlcXVpcmUoXCIuLi9jYXItc2NoZW1hL3J1blwiKTtcclxudmFyIGRlZlRvQ2FyID0gcmVxdWlyZShcIi4uL2Nhci1zY2hlbWEvZGVmLXRvLWNhclwiKTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gcnVuRGVmcztcclxuZnVuY3Rpb24gcnVuRGVmcyh3b3JsZF9kZWYsIGRlZnMsIGxpc3RlbmVycykge1xyXG4gIGlmICh3b3JsZF9kZWYubXV0YWJsZV9mbG9vcikge1xyXG4gICAgLy8gR0hPU1QgRElTQUJMRURcclxuICAgIHdvcmxkX2RlZi5mbG9vcnNlZWQgPSBidG9hKE1hdGguc2VlZHJhbmRvbSgpKTtcclxuICB9XHJcblxyXG4gIHZhciBzY2VuZSA9IHNldHVwU2NlbmUod29ybGRfZGVmKTtcclxuICBzY2VuZS53b3JsZC5TdGVwKDEgLyB3b3JsZF9kZWYuYm94MmRmcHMsIDIwLCAyMCk7XHJcbiAgY29uc29sZS5sb2coXCJhYm91dCB0byBidWlsZCBjYXJzXCIpO1xyXG4gIHZhciBjYXJzID0gZGVmcy5tYXAoKGRlZiwgaSkgPT4ge1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaW5kZXg6IGksXHJcbiAgICAgIGRlZjogZGVmLFxyXG4gICAgICBjYXI6IGRlZlRvQ2FyKGRlZiwgc2NlbmUud29ybGQsIHdvcmxkX2RlZiksXHJcbiAgICAgIHN0YXRlOiBjYXJSdW4uZ2V0SW5pdGlhbFN0YXRlKHdvcmxkX2RlZilcclxuICAgIH07XHJcbiAgfSk7XHJcbiAgdmFyIGFsaXZlY2FycyA9IGNhcnM7XHJcbiAgcmV0dXJuIHtcclxuICAgIHNjZW5lOiBzY2VuZSxcclxuICAgIGNhcnM6IGNhcnMsXHJcbiAgICBzdGVwOiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgIGlmIChhbGl2ZWNhcnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwibm8gbW9yZSBjYXJzXCIpO1xyXG4gICAgICB9XHJcbiAgICAgIHNjZW5lLndvcmxkLlN0ZXAoMSAvIHdvcmxkX2RlZi5ib3gyZGZwcywgMjAsIDIwKTtcclxuICAgICAgbGlzdGVuZXJzLnByZUNhclN0ZXAoKTtcclxuICAgICAgYWxpdmVjYXJzID0gYWxpdmVjYXJzLmZpbHRlcihmdW5jdGlvbiAoY2FyKSB7XHJcbiAgICAgICAgY2FyLnN0YXRlID0gY2FyUnVuLnVwZGF0ZVN0YXRlKFxyXG4gICAgICAgICAgd29ybGRfZGVmLCBjYXIuY2FyLCBjYXIuc3RhdGVcclxuICAgICAgICApO1xyXG4gICAgICAgIHZhciBzdGF0dXMgPSBjYXJSdW4uZ2V0U3RhdHVzKGNhci5zdGF0ZSwgd29ybGRfZGVmKTtcclxuICAgICAgICBsaXN0ZW5lcnMuY2FyU3RlcChjYXIpO1xyXG4gICAgICAgIGlmIChzdGF0dXMgPT09IDApIHtcclxuICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXIuc2NvcmUgPSBjYXJSdW4uY2FsY3VsYXRlU2NvcmUoY2FyLnN0YXRlLCB3b3JsZF9kZWYpO1xyXG4gICAgICAgIGxpc3RlbmVycy5jYXJEZWF0aChjYXIpO1xyXG5cclxuICAgICAgICB2YXIgd29ybGQgPSBzY2VuZS53b3JsZDtcclxuICAgICAgICB2YXIgd29ybGRDYXIgPSBjYXIuY2FyO1xyXG4gICAgICAgIHdvcmxkLkRlc3Ryb3lCb2R5KHdvcmxkQ2FyLmNoYXNzaXMpO1xyXG5cclxuICAgICAgICBmb3IgKHZhciB3ID0gMDsgdyA8IHdvcmxkQ2FyLndoZWVscy5sZW5ndGg7IHcrKykge1xyXG4gICAgICAgICAgd29ybGQuRGVzdHJveUJvZHkod29ybGRDYXIud2hlZWxzW3ddKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgfSlcclxuICAgICAgaWYgKGFsaXZlY2Fycy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICBsaXN0ZW5lcnMuZ2VuZXJhdGlvbkVuZChjYXJzKTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbn1cclxuIiwiLyogZ2xvYmFscyBiMldvcmxkIGIyVmVjMiBiMkJvZHlEZWYgYjJGaXh0dXJlRGVmIGIyUG9seWdvblNoYXBlICovXHJcblxyXG4vKlxyXG5cclxud29ybGRfZGVmID0ge1xyXG4gIGdyYXZpdHk6IHt4LCB5fSxcclxuICBkb1NsZWVwOiBib29sZWFuLFxyXG4gIGZsb29yc2VlZDogc3RyaW5nLFxyXG4gIHRpbGVEaW1lbnNpb25zLFxyXG4gIG1heEZsb29yVGlsZXMsXHJcbiAgbXV0YWJsZV9mbG9vcjogYm9vbGVhblxyXG59XHJcblxyXG4qL1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih3b3JsZF9kZWYpe1xyXG5cclxuICB2YXIgd29ybGQgPSBuZXcgYjJXb3JsZCh3b3JsZF9kZWYuZ3Jhdml0eSwgd29ybGRfZGVmLmRvU2xlZXApO1xyXG4gIHZhciBmbG9vclRpbGVzID0gY3dfY3JlYXRlRmxvb3IoXHJcbiAgICB3b3JsZCxcclxuICAgIHdvcmxkX2RlZi5mbG9vcnNlZWQsXHJcbiAgICB3b3JsZF9kZWYudGlsZURpbWVuc2lvbnMsXHJcbiAgICB3b3JsZF9kZWYubWF4Rmxvb3JUaWxlcyxcclxuICAgIHdvcmxkX2RlZi5tdXRhYmxlX2Zsb29yXHJcbiAgKTtcclxuXHJcbiAgdmFyIGxhc3RfdGlsZSA9IGZsb29yVGlsZXNbXHJcbiAgICBmbG9vclRpbGVzLmxlbmd0aCAtIDFcclxuICBdO1xyXG4gIHZhciBsYXN0X2ZpeHR1cmUgPSBsYXN0X3RpbGUuR2V0Rml4dHVyZUxpc3QoKTtcclxuICB2YXIgdGlsZV9wb3NpdGlvbiA9IGxhc3RfdGlsZS5HZXRXb3JsZFBvaW50KFxyXG4gICAgbGFzdF9maXh0dXJlLkdldFNoYXBlKCkubV92ZXJ0aWNlc1szXVxyXG4gICk7XHJcbiAgd29ybGQuZmluaXNoTGluZSA9IHRpbGVfcG9zaXRpb24ueDtcclxuICByZXR1cm4ge1xyXG4gICAgd29ybGQ6IHdvcmxkLFxyXG4gICAgZmxvb3JUaWxlczogZmxvb3JUaWxlcyxcclxuICAgIGZpbmlzaExpbmU6IHRpbGVfcG9zaXRpb24ueFxyXG4gIH07XHJcbn1cclxuXHJcbmZ1bmN0aW9uIGN3X2NyZWF0ZUZsb29yKHdvcmxkLCBmbG9vcnNlZWQsIGRpbWVuc2lvbnMsIG1heEZsb29yVGlsZXMsIG11dGFibGVfZmxvb3IpIHtcclxuICB2YXIgbGFzdF90aWxlID0gbnVsbDtcclxuICB2YXIgdGlsZV9wb3NpdGlvbiA9IG5ldyBiMlZlYzIoLTUsIDApO1xyXG4gIHZhciBjd19mbG9vclRpbGVzID0gW107XHJcbiAgTWF0aC5zZWVkcmFuZG9tKGZsb29yc2VlZCk7XHJcbiAgZm9yICh2YXIgayA9IDA7IGsgPCBtYXhGbG9vclRpbGVzOyBrKyspIHtcclxuICAgIGlmICghbXV0YWJsZV9mbG9vcikge1xyXG4gICAgICAvLyBrZWVwIG9sZCBpbXBvc3NpYmxlIHRyYWNrcyBpZiBub3QgdXNpbmcgbXV0YWJsZSBmbG9vcnNcclxuICAgICAgbGFzdF90aWxlID0gY3dfY3JlYXRlRmxvb3JUaWxlKFxyXG4gICAgICAgIHdvcmxkLCBkaW1lbnNpb25zLCB0aWxlX3Bvc2l0aW9uLCAoTWF0aC5yYW5kb20oKSAqIDMgLSAxLjUpICogMS41ICogayAvIG1heEZsb29yVGlsZXNcclxuICAgICAgKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIGlmIHBhdGggaXMgbXV0YWJsZSBvdmVyIHJhY2VzLCBjcmVhdGUgc21vb3RoZXIgdHJhY2tzXHJcbiAgICAgIGxhc3RfdGlsZSA9IGN3X2NyZWF0ZUZsb29yVGlsZShcclxuICAgICAgICB3b3JsZCwgZGltZW5zaW9ucywgdGlsZV9wb3NpdGlvbiwgKE1hdGgucmFuZG9tKCkgKiAzIC0gMS41KSAqIDEuMiAqIGsgLyBtYXhGbG9vclRpbGVzXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgICBjd19mbG9vclRpbGVzLnB1c2gobGFzdF90aWxlKTtcclxuICAgIHZhciBsYXN0X2ZpeHR1cmUgPSBsYXN0X3RpbGUuR2V0Rml4dHVyZUxpc3QoKTtcclxuICAgIHRpbGVfcG9zaXRpb24gPSBsYXN0X3RpbGUuR2V0V29ybGRQb2ludChsYXN0X2ZpeHR1cmUuR2V0U2hhcGUoKS5tX3ZlcnRpY2VzWzNdKTtcclxuICB9XHJcbiAgcmV0dXJuIGN3X2Zsb29yVGlsZXM7XHJcbn1cclxuXHJcblxyXG5mdW5jdGlvbiBjd19jcmVhdGVGbG9vclRpbGUod29ybGQsIGRpbSwgcG9zaXRpb24sIGFuZ2xlKSB7XHJcbiAgdmFyIGJvZHlfZGVmID0gbmV3IGIyQm9keURlZigpO1xyXG5cclxuICBib2R5X2RlZi5wb3NpdGlvbi5TZXQocG9zaXRpb24ueCwgcG9zaXRpb24ueSk7XHJcbiAgdmFyIGJvZHkgPSB3b3JsZC5DcmVhdGVCb2R5KGJvZHlfZGVmKTtcclxuICB2YXIgZml4X2RlZiA9IG5ldyBiMkZpeHR1cmVEZWYoKTtcclxuICBmaXhfZGVmLnNoYXBlID0gbmV3IGIyUG9seWdvblNoYXBlKCk7XHJcbiAgZml4X2RlZi5mcmljdGlvbiA9IDAuNTtcclxuXHJcbiAgdmFyIGNvb3JkcyA9IG5ldyBBcnJheSgpO1xyXG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoMCwgMCkpO1xyXG4gIGNvb3Jkcy5wdXNoKG5ldyBiMlZlYzIoMCwgLWRpbS55KSk7XHJcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMihkaW0ueCwgLWRpbS55KSk7XHJcbiAgY29vcmRzLnB1c2gobmV3IGIyVmVjMihkaW0ueCwgMCkpO1xyXG5cclxuICB2YXIgY2VudGVyID0gbmV3IGIyVmVjMigwLCAwKTtcclxuXHJcbiAgdmFyIG5ld2Nvb3JkcyA9IGN3X3JvdGF0ZUZsb29yVGlsZShjb29yZHMsIGNlbnRlciwgYW5nbGUpO1xyXG5cclxuICBmaXhfZGVmLnNoYXBlLlNldEFzQXJyYXkobmV3Y29vcmRzKTtcclxuXHJcbiAgYm9keS5DcmVhdGVGaXh0dXJlKGZpeF9kZWYpO1xyXG4gIHJldHVybiBib2R5O1xyXG59XHJcblxyXG5mdW5jdGlvbiBjd19yb3RhdGVGbG9vclRpbGUoY29vcmRzLCBjZW50ZXIsIGFuZ2xlKSB7XHJcbiAgcmV0dXJuIGNvb3Jkcy5tYXAoZnVuY3Rpb24oY29vcmQpe1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgeDogTWF0aC5jb3MoYW5nbGUpICogKGNvb3JkLnggLSBjZW50ZXIueCkgLSBNYXRoLnNpbihhbmdsZSkgKiAoY29vcmQueSAtIGNlbnRlci55KSArIGNlbnRlci54LFxyXG4gICAgICB5OiBNYXRoLnNpbihhbmdsZSkgKiAoY29vcmQueCAtIGNlbnRlci54KSArIE1hdGguY29zKGFuZ2xlKSAqIChjb29yZC55IC0gY2VudGVyLnkpICsgY2VudGVyLnksXHJcbiAgICB9O1xyXG4gIH0pO1xyXG59XHJcbiJdfQ==
