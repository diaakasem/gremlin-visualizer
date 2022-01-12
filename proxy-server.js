const https = require('https');
const express = require('express');
var axios = require('axios');
const bodyParser = require('body-parser');
const gremlin = require('gremlin');
const cors = require('cors');
const { formatVerticesOuptput } = require('./format');

const app = express();
const port = 3001;

const { DriverRemoteConnection } = gremlin.driver;
const { Graph } = gremlin.structure;

app.use(cors({
    credentials: true,
}));

// parse application/json
app.use(bodyParser.json());

function mapToObj(inputMap) {
    let obj = {};
    inputMap = (inputMap['@value'] || inputMap);

    inputMap.forEach((key, i) => {
        if (i%2 === 1) {
            return;
        }
        obj[key] = inputMap[i + 1];
    });
    return obj;
}

function edgesToJson(edgeList) {
    return edgeList['@value'].map(
        edge => {
            edge = mapToObj(edge);
            console.info(edge);
            return {
                id: typeof edge.id !== "string" ? JSON.stringify(edge.id) : edge.id,
                from: edge.from,
                to: edge.to,
                label: edge.label,
                properties: mapToObj(edge.properties),
            };
        }
    );
}

function nodesToJson(nodeList) {
    return nodeList.map(
        node => {
            node = mapToObj(node['@value'] || node);
            console.info(node);
            return {
                id: node.id,
                label: node.label,
                properties: mapToObj(node.properties),
                edges: edgesToJson(node.edges)
            };
        }
    );
}

function makeQuery(query, nodeLimit) {
    const nodeLimitQuery = !isNaN(nodeLimit) && Number(nodeLimit) > 0 ? `.limit(${nodeLimit})`: '';
    const q = `${query}${nodeLimitQuery}.dedup().as('node').project('id', 'label', 'properties', 'edges').by(id()).by(label()).by(valueMap().by(unfold())).by(outE().project('id', 'from', 'to', 'label', 'properties').by(id()).by(select('node').id()).by(inV().id()).by(label()).by(valueMap().by(unfold())).fold())`;
    console.info(q);
    return q;
}

app.post('/query', (req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

    const gremlinHost = req.body.host;
    const gremlinPort = req.body.port;
    const nodeLimit = req.body.nodeLimit;
    const query = req.body.query;
    console.info(req.body);

    // const client = new gremlin.driver.Client(`ws://${gremlinHost}:${gremlinPort}/gremlin`, { traversalSource: 'g', mimeType: 'application/json' });
    const url = `https://${gremlinHost}:${gremlinPort}/gremlin`;
    console.info(url);
    // const client = new gremlin.driver.Client(url, {
    // traversalSource: 'g',
    // mimeType: 'application/json'
    // });

    // const graph = new Graph();
    // const connection = new DriverRemoteConnection(url);
    // const client = graph.traversal().withRemote(connection);

    const data = JSON.stringify({
        "gremlin": makeQuery(query, nodeLimit)
    });

    const config = {
        httpsAgent: new https.Agent({  
            rejectUnauthorized: false
        }),
        method: 'post',
        url,
        headers: { 
            'Content-Type': 'application/json', 
            'Cookie': 'connect.sid=s%3AIYErFByPVGfmsJxmgsM_3yj1OOYBAccH.sdOIyFfuyYJAsO2bxi1VyLQ1miIY9pNHyStGF7fT2us; connect.sid=s%3AIYErFByPVGfmsJxmgsM_3yj1OOYBAccH.sdOIyFfuyYJAsO2bxi1VyLQ1miIY9pNHyStGF7fT2us'
        },
        data : data
    };

    axios(config)
        .then(function (response) {
            console.info(response);
            const result = formatVerticesOuptput(response.data.result.data['@value']);
            console.info(result);
            res.send(nodesToJson(result))
        })
        .catch(function (error) {
            console.log(error);
            next(error)
        });


    // client.submit(, {})
    // .then((result) => {
    // })
    // .catch((err) => {
    // console.error(err);
    // next(err)
    // });

});

app.listen(port, () => console.log(`Simple gremlin-proxy server listening on port ${port}!`));
