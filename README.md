# OData V2 Service Metadata Document (limited)

The package is based on [odata-v4-service-metadata](https://github.com/jaystack/odata-v4-service-metadata) package. We need to generate OData V2 metadata. 
Currently its capabilities are limited: we only process Entities and Associations.
 
Using this module you can generate a service metadata document response from a simple JSON format, an advanced schema JSON format or an Edmx instance created with [odata-v4-metadata](https://github.com/jaystack/odata-v4-metadata).

## Basic usage

Use the simple JSON format and convert your metadata JSON to a service metadata document.

```javascript
var ServiceMetadata = require('odata-v4-service-metadata').ServiceMetadata;

// $metadata express.js route
app.get('/odata/\\$metadata', ServiceMetadata.defineEntities({
    namespace: 'Default',
    containerName: 'Container',
    entities: [
        {
            name: 'Kitten',
            collectionName: 'Kittens',
            keys: ['Id'],
            computedKey: true,
            properties: {
                Id: 'Edm.String',
                Name: 'Edm.String',
                Age: 'Edm.Int32',
                Lives: 'Edm.Int32',
                Owner: 'Edm.String'
            },
            annotations:[
                { name: 'UI.DisplayName', value: 'Meww' },
                { property: 'Id', name: 'UI.ReadOnly', value: 'true' },
                { property: 'Title', name: 'UI.DisplayName', value: 'Meww Meww' },
            ]
        }
    ]
}).requestHandler());
```

## Advanced usage

Use a schema JSON, which is more verbose, but you can customize the metadata in a more advanced way.

```javascript
var ServiceMetadata = require('@tjc-group/odata-v2-service-metadata').ServiceMetadata;
var schema = require('./schema');
var serviceMetadata = ServiceMetadata.processMetadataJson(schema);
var serviceMetadataDocument = serviceMetadata.document();
```

An example schema JSON looks like [this](https://raw.githubusercontent.com/jaystack/odata-v4-service-metadata/master/tests/schema2.json)
