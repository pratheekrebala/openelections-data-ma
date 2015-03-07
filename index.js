var downcache = require('downcache');
var cheerio = require('cheerio');
var fs = require('fs-extra');

//URI Variables
var searchIndex = "http://electionstats.state.ma.us/elections/search/year_from:2002/year_to:2012/";
var officeIndex = "http://electionstats.state.ma.us/elections/search/year_from:2002/year_to:2012/office_id:$officeID";
var dataDownloadPrecincts = "http://electionstats.state.ma.us/elections/download/$electionID/precincts_include:1/";
var offices = [];

downcache(searchIndex, function(err, resp, body) {
  var $ = cheerio.load(body);
  $("#SearchOfficeId").find("option").each(function(index,data){
    if(data.attribs.value !== '') {
      var officeId = data.attribs.value;
      processOffice(officeId)
      offices.push(officeId);
    }
  });
});

function processOffice(officeId){
  downcache(officeIndex.replace("$officeID",officeId), function(err,resp,body){
    var $ = cheerio.load(body);
    $("#search_results_table > tbody").find("tr").each(function(index,data){
      var electionid = /election-id-(.*?)$/;
      if(electionid.test(data.attribs.id)){
        var electionData = cheerio.load(data)("td");
        var year = cheerio.load(electionData[0])('*').text();
        var office = cheerio.load(electionData[1])('*').text();
        var district = cheerio.load(electionData[2])('*').text();
        var stage = cheerio.load(electionData[3])('*').text();
        processElection(electionid.exec(data.attribs.id)[1], year,office,district,stage);
      }
    });
  });
}

function processElection(electionID,year,office,district,stage){
  var fileNamePattern = /filename=PD43\+__(.*?)_(.*?)$/;
  downcache(dataDownloadPrecincts.replace("$electionID", electionID), {force:true} ,function(err, resp, body){
    var disposition = resp.response.headers['content-disposition'];
      if(fileNamePattern.test(disposition)){
        var fileName = fileNamePattern.exec(disposition);
        writeCSV("./data/" + year + "/" + office + "/" + district + "/" + fileName[2], body);
      }
  });
}


function writeCSV(loc,csv){
	    fs.outputFile(loc, csv, function(err){
        if(!err) console.log(loc + " Written");
        else console.log(err);
      });
}
