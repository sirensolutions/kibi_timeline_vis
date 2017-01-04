'use strict';

var elasticsearch = require('elasticsearch');
var format = require('string-template');

var ES_INDEX_NAME = 'spaceship_project',
    ES_PORT = 9220,
    ES_HOST = 'localhost',
    ES_DOC_TYPE = 'spaceship',
    LOG_NAME = 'trace';

var ES_DOCS = [
  {
    id: '1',
    title: ES_DOC_TYPE,
    label: 'Fuselage',
    produced_date: '2010-09-05',
    end_of_work_date: '2030-09-05',
    meta: {
      first_battle: '2011-09-05',
      last_battle: '2029-09-05'
    }
  },
  {
    id: '2',
    title: ES_DOC_TYPE,
    label: ['Tanks'],
    produced_date: ['2010-04-01', '2011-06-09'],
    end_of_work_date: ['2023-04-01'],
    meta: {
      first_battle: ['2011-09-06'],
      last_battle: ['2022-09-05']
    }
  },
  {
    id: '3',
    title: ES_DOC_TYPE,
    label: ['Rudder', 'Wing'],
    produced_date: ['2012-03-01', '2013-05-01', '2014-08-23'],
    end_of_work_date: ['2022-03-01', '2023-05-01', '2024-08-23'],
    meta: {
      first_battle: ['2012-04-06', '2013-06-01', '2014-08-23'],
      last_battle: ['2021-03-01', '2021-05-01', '2021-08-23']
    }
  },
  {
    id: '4',
    title: ES_DOC_TYPE,
    label: ['Pumps', 'Oxidizer'],
    produced_date: ['2015-01-01', '2016-02-01'],
    end_of_work_date: ['2022-01-01', '2022-02-01'],
    meta: {
      first_battle: ['2015-02-01', '2016-03-01'],
      last_battle: ['2021-01-01', '2020-02-01']
    }
  },
  {
    id: '5',
    title: ES_DOC_TYPE,
    label: ['Engine', 'Nozzle', 'Exhaust'],
    produced_date: ['2013-01-01', '2014-02-01', '2016-04-07'],
    end_of_work_date: ['2023-01-01', '2024-02-01', '2026-04-07'],
    meta: {
      first_battle: ['2014-01-01', '2015-02-01', '2017-04-07'],
      last_battle: ['2022-01-01', '2023-02-01', '2025-04-07']
    }
  }
];

function indice_doc_into_es(client, doc, callback) {
  client.create({
    index: ES_INDEX_NAME,
    type: ES_DOC_TYPE,
    id: doc.id,
    body: {
      title: doc.title,
      label: doc.label,
      produced_date: doc.produced_date,
      end_of_work_date: doc.end_of_work_date,
      meta: doc.meta
    }
  }, function (error, response) {
    if (error) {
      console.log(format('Error: {0}', error));
    } else {
      console.log(response);
    }
  });

  if (callback) {
    callback();
  }
}

function search_index (client, query) {
  console.log('DOCUMENTS:');
  client.search({
    index: ES_INDEX_NAME,
    q: query
  }, function (error, response) {
    if (error) {
      console.log(format('Error: {0}', error));
    } else {
      console.log(response);
    }
  });
}

// init ES client API
var client = new elasticsearch.Client({
  host: format('{0}:{1}', [ES_HOST, ES_PORT]),
  log: LOG_NAME
});

// delete index
client.indices.delete({
  index: ES_INDEX_NAME,
  ignore: [404]
}).then(function () {
  console.log(format('The index {0} was deleted!', ES_INDEX_NAME));
}, function (error) {
  console.log(format('Error: {0}', error));
});

// create index
client.indices.create({
  index: ES_INDEX_NAME,
  ignore: [404]
}).then(function () {
  console.log(format('The index {0} has been created!', ES_INDEX_NAME));

  var doc;
  // insert documents
  for (doc in ES_DOCS) {
    if (ES_DOCS.hasOwnProperty(doc)) {
      indice_doc_into_es(client, ES_DOCS[doc]);
    }
  }

}, function (error) {
  console.log(format('Error: {0}', error));
});



