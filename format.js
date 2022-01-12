const _ = require('lodash');

/**
 * isIterable.
 *
 * @param {} value
 */
function isIterable (value) {
  return Symbol.iterator in Object(value);
}

/**
 * formatNeptuneObject.
 *
 * @param {} neptuneValue
 * @param {string[]} arrays List of key names to be considered arrays,
 * and not get the first entry if length is 1
 * if null passed .. means never change array to object
 */
function formatNeptuneObject(neptuneValue, arrays) {
    if (!arrays) { arrays = [] }
    if (!neptuneValue) {
        return neptuneValue;
    }
    if (_.isArray(neptuneValue)) {
        if (neptuneValue.length === 1) {
            return formatNeptuneObject(_.first(neptuneValue), arrays);
        }
        return _.map(neptuneValue, (r) => formatNeptuneObject(r, arrays));
    }
    // console.info(neptuneValue);
    neptuneValue = neptuneValue.value || neptuneValue;
    if (!isIterable(neptuneValue) || _.isString(neptuneValue)) {
        // console.info('Not iterable');
        return neptuneValue;
    }
    // In case of having a property ID instead of the actual ID of the vertex
    if (neptuneValue.has('id') && neptuneValue.entries().next().value[0].elementName === 'id') {
        neptuneValue.delete('id');
    }
    const res = Object.fromEntries(neptuneValue);
    if (_.isArray(res)) {
        return _.map(res, (r) => formatNeptuneObject(r, arrays));
    }
    const qRes = _.mapValues(res, (v) => {
        if (isIterable(v)) {
            try {
                if (_.isArray(v)) {
                    return _.map(v, (x) => {
                        if (!_.isString(x) && (typeof x) === 'object') {
                            let isTrackVertex = false;
                            x.forEach((value, key) => {
                                if (key && key.elementName === 'label' && value === 'track') {
                                    isTrackVertex = true;
                                    return;
                                }
                            })
                            if (isTrackVertex) {
                                x.delete('id');
                            }
                        }
                        return formatNeptuneObject(x, arrays)
                    });
                }
                if (!_.isString(v) && (typeof v) === 'object') {
                    let isTrackVertex = false;
                    v.forEach((value, key) => {
                        if (key && key.elementName === 'label' && value === 'track') {
                            isTrackVertex = true;
                            return;
                        }
                    })
                    if (isTrackVertex) {
                        v.delete('id');
                    }
                }
                if (_.isString(v)) {
                    return v;
                }
                const result = Object.fromEntries(v);
                if (result.images) {
                    if (_.isString(result.images)) {
                        try {
                            result.images = JSON.parse(result.images);
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }
                return result;
            } catch (e) {
                // console.error(e);
                return v;
            }
        }
        return v;
    });
    const output = _.mapValues(qRes, (v, k) => {
        // if null passed .. means never change array to object
        if (!arrays || _.includes(arrays, k)) {
            return v;
        }
        if (_.isArray(v) && v.length === 1) {
            return _.first(v);
        }
        return v;
    });
    if (_.isString(output.images)) {
        try {
            output.images = JSON.parse(output.images);
        } catch (e) {
            console.error(e);
        }
    }
    return output;
}

function formatVerticesOuptput(vertices, arrays) {
    if (!arrays) {
        arrays = [] ;
    }
    if (!vertices) {
        return vertices;
    }
    const result = formatNeptuneObject(vertices, arrays);
    if (_.isArray(vertices) && !_.isArray(result)) {
        return [result];
    }
    return result;
}

module.exports = { formatVerticesOuptput };
