var create = require("../create-instance");
var selection = require("./selection.js/");
module.exports = {
  generationZero: generationZero,
  nextGeneration: nextGeneration
}

function generationZero(config){
  var generationSize = config.generationSize,
  schema = config.schema;
  var cw_carGeneration = [];
  for (var k = 0; k < generationSize; k++) {
    var def = create.createGenerationZero(schema, function(){
      return Math.random()
    });
    def.index = k;
    cw_carGeneration.push(def);
  }
  return {
    counter: 0,
    generation: cw_carGeneration,
  };
}

function nextGeneration(
  previousState,
  scores,
  config
){
  var champion_length = config.championLength,
    generationSize = config.generationSize,
    selectFromAllParents = config.selectFromAllParents;
	scores.sort(function(a, b){return a.score.s - b.score.s;});

  var newGeneration = new Array();
  var newborn;
  var arr = [];
  console.log("Log -- "+previousState.counter);
  //console.log(scores);
  for (var k = 0; k < 20; k++) {
	var selParent = selection.rouleteWheelSel(scores);
    newGeneration.push(selParent.def);
	var remCar = scores.findIndex(x=> x.index===selParent.index)
	scores.splice(remCar,1);
  }
	//console.log(newGeneration);

  return {
    counter: previousState.counter + 1,
    generation: newGeneration,
  };
}



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