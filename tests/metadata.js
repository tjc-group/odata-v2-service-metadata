var ServiceMetadata = require('../lib/metadata').ServiceMetadata


var schema = require('./schema2')
describe('metadata', () => {
    it('xml', (done) => {
        var m = ServiceMetadata.processMetadataJson(schema)

        var fs = require('fs');
        fs.writeFile("./metadata.xml", m, function(err) {
            if (err) {
                return console.log(err);
            }

            console.log("The file was saved!");
            done()
        });
    });
    
    it.skip('defineEntities', (done) => {
        var m = ServiceMetadata.defineEntities({
            namespace: 'JayData.Entities',
            containerName: 'Container',
            entities: [
                {
                    name: 'Article',
                    collectionName: 'Articles',
                    keys: ['Id', 'Id2'],
                    computedKey: true,
                    properties: {
                        Id: 'Edm.Int32',
                        Id2: 'Edm.Int32',
                        Title: 'Edm.String',
                        Body: 'Edm.String'
                    },
                    annotations:[
                        { name: 'UI.DisplayName', value: 'Arts' },
                        { property: 'Id', name: 'UI.ReadOnly', value: 'true' },
                        { property: 'Title', name: 'UI.DisplayName', value: 'Article Title' },
                    ]
                },
                {
                    name: 'Category',
                    collectionName: 'Categories',
                    keys: ['Id'],
                    computedKey: true,
                    properties: {
                        Id: 'Edm.Int32',
                        Title: 'Edm.String'
                    }
                }
            ]
        })
        
        
        var fs = require('fs');
        fs.writeFile("./metadata2.xml", m, function(err) {
            if (err) {
                return console.log(err);
            }

            console.log("The file was saved!");
            done()
        });
        
    })
})