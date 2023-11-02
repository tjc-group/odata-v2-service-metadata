import { Edm } from '@tjc-group/odata-v4-metadata'
import * as extend from 'extend'
import { Xml } from './XmlCreator'
import * as metacode from './metacode'

class EndPoint extends Edm.EdmItemBase {
    @metacode.parse
    type: string

    @metacode.parse
    role: string

    @metacode.parse
    multiplicity: string
}

let endPointAttributes: Object = {
    type: { name: 'Type' },
    role: { name: 'Role' },
    multiplicity: { name: 'Multiplicity' }
}

let associationSetEndPointAttributes: Object = {
    type: { name: 'EntitySet' },
    role: { name: 'Role' }
}

class Association extends Edm.EdmItemBase {
    @metacode.parse
    name: string

    @metacode.parse
    ends: Array<EndPoint>
}

class AssociationSet extends Edm.EdmItemBase {
    @metacode.parse
    name: string

    @metacode.parse
    association: Association

    @metacode.parse
    ends: Array<EndPoint>
}

class SchemaV2 extends Edm.Schema {
    associations: Array<Association>
}

class EntityContainerV2 extends Edm.EntityContainer {
    associationSets: Array<AssociationSet>
}


export class XmlMetadata {
    public metadata: Edm.Edmx
    private options: any

    constructor(options: any, edmx: Edm.Edmx) {
        this.options = extend({
            edmx: "http://schemas.microsoft.com/ado/2007/06/edmx",
            m: 'http://schemas.microsoft.com/ado/2007/08/dataservices/metadata',
            d: 'http://schemas.microsoft.com/ado/2007/08/dataservices',
            namespace: 'http://schemas.microsoft.com/ado/2008/09/edm',
            edmxVersion: '1.0',
            DataServiceVersion: "2.0",
            xmlHead: '<?xml version="1.0" encoding="utf-8" standalone="yes"?>',
            contextNamespace: 'MyContext'
        }, options)

        this.metadata = edmx
    }


    processMetadata() {
        var xml = new Xml.XmlCreator()
        var xmlResult = this.options.xmlHead

        xml.startDocument()
        this.buildEdmx(xml, this.metadata)
        xml.endDocument()

        xmlResult += xml.getXmlString()

        return xmlResult
    }

    buildEdmx(xml: Xml.XmlCreator, edmx: Edm.Edmx) {
        var edmxElement = xml.declareElement(xml.declareNamespace(this.options.edmx, 'edmx'), 'Edmx');

        xml.startElement(edmxElement)
            .addAttribute(xml.declareAttribute('Version'), "1.0");

        this.buildDataServices(xml, edmx.dataServices);
        xml.endElement();
    }

    buildDataServices(xml: Xml.XmlCreator, dataservices: Edm.DataServices) {
        // var ns = xml.declareNamespace(this.options.edmx, 'edmx');
        var dataservicesElement = xml.declareElement(xml.declareNamespace(this.options.edmx, 'edmx'), 'DataServices');
        var version = xml.declareAttribute('m:DataServiceVersion');

        xml.startElement(dataservicesElement)
            .addAttribute(xml.declareAttribute('xmlns:m'), this.options.m)
            .addAttribute(version, this.options.DataServiceVersion || "2.0");

        this.buildSchema(xml, dataservices.schemas);
        xml.endElement();
    }

    buildSchema(xml: Xml.XmlCreator, schemas: Edm.Schema[]) {
        schemas && schemas.forEach(schema => {
            var xmlns = xml.declareAttribute('xmlns');
            var schemaElement = xml.declareElement('Schema');
            var ns = xml.declareAttribute('Namespace');

            xml.startElement(schemaElement)
                .addAttribute(xml.declareAttribute('xmlns:d'), this.options.d)
                .addAttribute(xml.declareAttribute('xmlns:m'), this.options.m)
                .addAttribute(xmlns, this.options.namespace)
                .addAttribute(ns, schema.namespace || this.options.contextNamespace || "default");

            if (schema.alias)
                xml.addAttribute(xml.declareAttribute('Alias'), schema.alias);

            this.buildEntityTypes(xml, schema.entityTypes, schema, schemas)
            this.buildComplexTypes(xml, schema.complexTypes, schema, schemas)
            this.buildTypeDefinitions(xml, schema.typeDefinitions)
            this.buildEnumTypes(xml, schema.enumTypes)
            // this.buildActions(xml, schema.actions)
            this.buildFunctions(xml, schema.functions)

            let schemaV2 = schema as SchemaV2;

            this.buildAssociations(xml, schemaV2.associations, schemaV2, schemas)

            let entityContainerV2: EntityContainerV2[];
            if (schemaV2.associations) {
                if (!schemaV2.entityContainer.length) {
                    schemaV2.entityContainer.push(new Edm.EntityContainer({
                        name: "Container"
                    }));
                }
                entityContainerV2 = schema.entityContainer.map(function (container: Edm.EntityContainer): EntityContainerV2 {
                    let result = container as EntityContainerV2;
                    result.associationSets = [];
                    let schemaV2 = schema as SchemaV2;
                    result.associationSets = schemaV2.associations.map(function (association): AssociationSet {
                        return new AssociationSet({
                            name: association.name + "_Set",
                            association: association,
                            ends: association.ends.map(end => {
                                return new EndPoint({
                                    role: end.role,
                                    type: end.type
                                });
                            })
                        });
                    });
                    return result;
                });
            }


            this.buildEntityContainer(xml, entityContainerV2);
            this.buildSchemaAnnotations(xml, schema.annotations)

            xml.endElement();
        })
    }

    buildAssociations(xml: Xml.XmlCreator, associations: Association[], _schema? : SchemaV2, _allSchemas?: Edm.Schema[]) {
        associations && associations.forEach(association => {
            var element = xml.declareElement('Association')
            var name = xml.declareAttribute('Name')
            xml.startElement(element)
                .addAttribute(name, association.name)

            this.buildAssociationEnds(xml, association.ends)

            xml.endElement()
        })
    }


    buildAssociationEnds(xml: Xml.XmlCreator, ends: EndPoint[]) {
        ends && ends.forEach(endPoint => {
            var element = xml.declareElement('End')
            xml.startElement(element)

            this.buildAttributes(xml, endPoint, endPointAttributes)

            xml.endElement()
        })
    }

    buildTypeDefinitions(xml: Xml.XmlCreator, typeDefinitions: Edm.TypeDefinition[]) {
        typeDefinitions && typeDefinitions.forEach(typeDefinition => {
            var rootElement = xml.declareElement('TypeDefinition')
            var name = xml.declareAttribute('Name')

            xml.startElement(rootElement)
                .addAttribute(name, typeDefinition.name)

            if (typeDefinition.underlyingType)
                xml.addAttribute(xml.declareAttribute('UnderlyingType'), typeDefinition.underlyingType)

            this.buildAnnotations(xml, typeDefinition.annotations)

            xml.endElement()
        })
    }

    buildEnumTypes(xml: Xml.XmlCreator, enumTypes: Edm.EnumType[]) {
        enumTypes && enumTypes.forEach((enumType: Edm.EnumType) => {
            var rootElement = xml.declareElement('EnumType')
            var name = xml.declareAttribute('Name')

            xml.startElement(rootElement)
                .addAttribute(name, enumType.name)

            if (enumType.namespace)
                xml.addAttribute(xml.declareAttribute('Namespace'), enumType.namespace)

            if (enumType.underlyingType)
                xml.addAttribute(xml.declareAttribute('UnderlyingType'), enumType.underlyingType)

            if (enumType.isFlags)
                xml.addAttribute(xml.declareAttribute('IsFlags'), enumType.isFlags)

            this.buildEnumMembers(xml, enumType.members)
            this.buildAnnotations(xml, enumType.annotations)

            xml.endElement()
        })
    }

    buildEntityTypes(xml: Xml.XmlCreator, entityTypes: Edm.EntityType[], _schema?: Edm.Schema, _allSchemas?: Edm.Schema[]) {
        entityTypes && entityTypes.forEach(entityType => {
            this.buildType(xml, entityType, 'EntityType', _schema, _allSchemas)
        })
    }

    buildComplexTypes(xml: Xml.XmlCreator, complexTypes: Edm.ComplexType[], _schema?: Edm.Schema, _allSchemas?: Edm.Schema[]) {
        complexTypes && complexTypes.forEach(complexType => {
            this.buildType(xml, complexType, 'ComplexType', _schema, _allSchemas)
        })
    }

    buildType(xml: Xml.XmlCreator, type: Edm.EntityType | Edm.ComplexType, xmlElementName: string, _currentSchema?: Edm.Schema, _allSchemas?: Edm.Schema[]) {
        var rootElement = xml.declareElement(xmlElementName)
        var name = xml.declareAttribute('Name')

        xml.startElement(rootElement)
            .addAttribute(name, type.name)

        if (type.baseType)
            xml.addAttribute(xml.declareAttribute('BaseType'), type.baseType)

        if (type.abstract)
            xml.addAttribute(xml.declareAttribute('Abstract'), type.abstract)

        if (type.openType)
            xml.addAttribute(xml.declareAttribute('OpenType'), type.openType)

        if (type.hasStream)
            xml.addAttribute(xml.declareAttribute('HasStream'), type.hasStream)

        if (type instanceof Edm.EntityType) {
            this.buildTypeKeys(xml, (<Edm.EntityType>type).key)
        }
        this.buildTypeProperties(xml, type.properties)
        this.buildTypeNavigationProperties(xml, type.navigationProperties, _currentSchema, _allSchemas)
        this.buildAnnotations(xml, type.annotations)

        xml.endElement()
    }

    buildTypeKeys(xml: Xml.XmlCreator, key: Edm.Key) {
        if (!key) return;

        var keyElement = xml.declareElement('Key')
        var propRef = xml.declareElement('PropertyRef')
        var name = xml.declareAttribute('Name')

        var keys = key.propertyRefs
        if (keys.length > 0) {
            xml.startElement(keyElement)

            keys.forEach(keyDef => {
                xml.startElement(propRef)
                    .addAttribute(name, keyDef.name)

                if (keyDef.alias)
                    xml.addAttribute(xml.declareAttribute('Alias'), keyDef.alias)

                xml.endElementInline()
            })
            xml.endElement()
        }
    }

    buildTypeProperties(xml: Xml.XmlCreator, properties: Edm.Property[]) {
        properties && properties.forEach(property => {
            var propertyElement = xml.declareElement('Property');

            xml.startElement(propertyElement);

            this.buildAttributes(xml, property, this.typePropertyAttributes)
            this.buildAnnotations(xml, property.annotations)

            xml.endElementInline();
        })
    }

    typePropertyAttributes: Object = {
        name: { name: 'Name' },
        type: { name: 'Type' },
        nullable: { name: 'Nullable' },
        maxLength: { name: 'MaxLength' },
        precision: { name: 'Precision' },
        scale: { name: 'Scale' },
        unicode: { name: 'Unicode' },
        SRID: { name: 'SRID' },
        defaultValue: { name: 'DefaultValue' }
    }

    buildTypeNavigationProperties(xml: Xml.XmlCreator, navigationProperties: Edm.NavigationProperty[], _schema?: Edm.Schema, _allSchemas?: Edm.Schema[]) {
        navigationProperties && navigationProperties.forEach(navigationProperty => {
            var navigationPropertyElement = xml.declareElement('NavigationProperty');

            var schemaV2 = _schema as SchemaV2;
            if (!schemaV2.associations) {
                schemaV2.associations = [];
            }

            var collectionMask = /Collection\(([\w.]+)\)/i
            var toType = navigationProperty.type
            let ends: Array<EndPoint> = []


            if (collectionMask.test(navigationProperty.type)) {
                var parts = toType.match(collectionMask);
                toType = parts && parts[1];
            }

            var toTypeSchema = _allSchemas.find(schema => {
                return toType.search(schema.namespace) === 0;
            });

            let relation = navigationProperty.partner + "_to_" + toType.replace(/\./g, "_");
            let relationship = relation;
            let i = 1;
            while (schemaV2.associations.some(association => association.name == relationship)) {
                relationship = relationship + "_" + i;
                i++;
            }

            var navigationPropertyV2 = {
                name: navigationProperty.name,
                fromRole: navigationProperty.partner + "Principal",
                toRole: toType.substr(toTypeSchema.namespace.length + 1) + "Dependent",
                relationship: _schema.namespace + "." + relationship
            }

            ends.push(new EndPoint({
                type: _schema.namespace + "." + navigationProperty.partner,
                role: navigationPropertyV2.fromRole,
                multiplicity: "1"
            }));

            ends.push(new EndPoint({
                type: toType,
                role: navigationPropertyV2.toRole,
                multiplicity: collectionMask.test(navigationProperty.type) ? "*" : "0..1"
            }));

            schemaV2.associations.push(new Association({
                name: relationship,
                ends: ends
            }))

            xml.startElement(navigationPropertyElement);

            this.buildAttributes(xml, navigationPropertyV2, this.typeNavigationPropertyAttributesV2)
            // this.buildNavPropertyReferentialConstraints(xml, navigationProperty.referentialConstraints)
            this.buildAnnotations(xml, navigationProperty.annotations)

            xml.endElementInline();
        })
    }

    buildNavPropertyReferentialConstraints(xml: Xml.XmlCreator, referentialConstraints: Edm.ReferentialConstraint[]) {
        referentialConstraints && referentialConstraints.forEach(referentialConstraint => {
            var referentialConstraintElement = xml.declareElement('ReferentialConstraint');
            xml.startElement(referentialConstraintElement);

            if (referentialConstraint.property)
                xml.addAttribute(xml.declareAttribute("Property"), referentialConstraint.property);

            if (referentialConstraint.referencedProperty)
                xml.addAttribute(xml.declareAttribute("ReferencedProperty"), referentialConstraint.referencedProperty);

            xml.endElementInline();
        })
    }

    typeNavigationPropertyAttributes: Object = {
        name: { name: 'Name' },
        type: { name: 'Type' },
        nullable: { name: 'Nullable' },
        containsTarget: { name: 'ContainsTarget' },
        partner: { name: 'Partner' }
    }

    typeNavigationPropertyAttributesV2: Object = {
        name: { name: 'Name' },
        relationship: { name: 'Relationship' },
        fromRole: { name: 'FromRole' },
        toRole: { name: 'ToRole' }
    }

    buildEnumMembers(xml: Xml.XmlCreator, members: Edm.Member[]) {
        members && members.forEach(member => {
            var memberElement = xml.declareElement('Member');

            xml.startElement(memberElement);

            this.buildAttributes(xml, member, this.typeMemberAttributes)
            this.buildAnnotations(xml, member.annotations)

            xml.endElementInline();
        })
    }

    typeMemberAttributes: Object = {
        name: { name: 'Name' },
        value: { name: 'Value' }
    }

    buildAttributes(xml: Xml.XmlCreator, object: any, mappings: any) {
        var attributes = mappings && Object.keys(mappings);
        object && attributes && attributes.forEach(prop => {
            if (typeof object[prop] !== 'undefined' && object[prop] !== null) {
                var attr = xml.declareAttribute(mappings[prop].name)
                xml.addAttribute(attr, object[prop].toString());
            }
        });
    }

    buildActions(xml: Xml.XmlCreator, actions: Edm.Action[]) {
        actions && actions.forEach(action => {
            var actionElement = xml.declareElement('Action');
            var name = xml.declareAttribute('Name')

            xml.startElement(actionElement)
                .addAttribute(name, action.name)

            if (typeof action.isBound !== 'undefined')
                xml.addAttribute(xml.declareAttribute('IsBound'), action.isBound.toString())

            if (action.entitySetPath)
                xml.addAttribute(xml.declareAttribute('EntitySetPath'), action.entitySetPath)

            this.buildParameters(xml, action.parameters)
            this.buildReturnType(xml, action.returnType)
            this.buildAnnotations(xml, action.annotations)

            xml.endElementInline();
        })
    }

    buildFunctions(xml: Xml.XmlCreator, functions: Edm.Function[]) {
        functions && functions.forEach(func => {
            var funcElement = xml.declareElement('Function');
            var name = xml.declareAttribute('Name')

            xml.startElement(funcElement)
                .addAttribute(name, func.name)

            if (typeof func.isBound !== 'undefined')
                xml.addAttribute(xml.declareAttribute('IsBound'), func.isBound.toString())

            if (func.entitySetPath)
                xml.addAttribute(xml.declareAttribute('EntitySetPath'), func.entitySetPath)

            if (typeof func.isComposable !== 'undefined')
                xml.addAttribute(xml.declareAttribute('IsComposable'), func.isComposable.toString())

            this.buildParameters(xml, func.parameters)
            this.buildReturnType(xml, func.returnType)
            this.buildAnnotations(xml, func.annotations)

            xml.endElementInline();
        })
    }

    buildParameters(xml: Xml.XmlCreator, parameters: Edm.Parameter[]) {
        parameters && parameters.forEach(parameter => {
            var parameterElement = xml.declareElement('Parameter');

            xml.startElement(parameterElement)

            this.buildAttributes(xml, parameter, this.parameterAttributes)
            this.buildAnnotations(xml, parameter.annotations)

            xml.endElementInline();
        })
    }

    parameterAttributes: Object = {
        name: { name: 'Name' },
        type: { name: 'Type' },
        nullable: { name: 'Nullable' },
        maxLength: { name: 'MaxLength' },
        precision: { name: 'Precision' },
        scale: { name: 'Scale' },
        unicode: { name: 'Unicode' },
        SRID: { name: 'SRID' }
    }

    buildReturnType(xml: Xml.XmlCreator, returnType: Edm.ReturnType) {
        if (!returnType ||
            typeof returnType.type === 'undefined')
            return

        var parameterElement = xml.declareElement('ReturnType');
        var type = xml.declareAttribute('Type')
        var nullable = xml.declareAttribute('Nullable')

        xml.startElement(parameterElement)
            .addAttribute(type, returnType.type)

        if (typeof returnType.nullable !== 'undefined')
            xml.addAttribute(nullable, returnType.nullable.toString())

        this.buildAnnotations(xml, returnType.annotations)

        xml.endElementInline();
    }


    buildEntityContainer(xml: Xml.XmlCreator, entityContainers: EntityContainerV2[]) {
        entityContainers && entityContainers.forEach(entityContainer => {
            var entityContainerElement = xml.declareElement('EntityContainer');
            var name = xml.declareAttribute('Name');

            xml.startElement(entityContainerElement)
                .addAttribute(name, entityContainer.name)
                .addAttribute(xml.declareAttribute('m:IsDefaultEntityContainer'), "true")

            this.buildEntitySets(xml, entityContainer.entitySets)
            this.buildAssociationSets(xml, entityContainer, entityContainer.associationSets);
            this.buildActionImports(xml, entityContainer.actionImports)
            this.buildFunctionImports(xml, entityContainer.functionImports)

            xml.endElement();
        })
    }

    buildEntitySets(xml: Xml.XmlCreator, entitySets: Edm.EntitySet[]) {
        entitySets && entitySets.forEach(entitySet => {
            var entitySetElement = xml.declareElement('EntitySet');
            var name = xml.declareAttribute('Name');
            var entityType = xml.declareAttribute('EntityType')

            xml.startElement(entitySetElement)
                .addAttribute(name, entitySet.name)
                .addAttribute(entityType, entitySet.entityType);

            this.buildAnnotations(xml, entitySet.annotations)

            xml.endElementInline();
        })
    }

    buildAssociationSets(xml: Xml.XmlCreator, entityContainer: EntityContainerV2, associationSets: AssociationSet[]) {
        associationSets && associationSets.forEach(associationSet => {
            let associationSetElement = xml.declareElement('AssociationSet');
            let name = xml.declareAttribute("Name");
            const association = xml.declareAttribute("Association");
            xml.startElement(associationSetElement)
                .addAttribute(name, associationSet.name)
                .addAttribute(association, `${(entityContainer.parent as any).namespace}.${associationSet.association.name}`)

            this.buildAssociationSetEnds(xml, associationSet.ends)

            xml.endElementInline();
        });
    }

    buildAssociationSetEnds(xml: Xml.XmlCreator, ends: EndPoint[]) {
        ends && ends.forEach(endPoint => {
            let endElement = xml.declareElement('End');
            xml.startElement(endElement)

            this.buildAttributes(xml, endPoint, associationSetEndPointAttributes)            

            xml.endElementInline();
        })
    }

    buildActionImports(xml: Xml.XmlCreator, actionImports: Edm.ActionImport[]) {
        actionImports && actionImports.forEach(actionImport => {
            var actionImportElement = xml.declareElement('ActionImport');
            var name = xml.declareAttribute('Name')
            var action = xml.declareAttribute('Action')

            xml.startElement(actionImportElement)
                .addAttribute(name, actionImport.name)
                .addAttribute(action, actionImport.action)

            this.buildAnnotations(xml, actionImport.annotations)

            xml.endElementInline();
        })
    }

    buildFunctionImports(xml: Xml.XmlCreator, functionImports: Edm.FunctionImport[]) {
        functionImports && functionImports.forEach(functionImport => {
            var FunctionImportElement = xml.declareElement('FunctionImport');
            var name = xml.declareAttribute('Name')
            var func = xml.declareAttribute('Function')

            xml.startElement(FunctionImportElement)
                .addAttribute(name, functionImport.name)
                .addAttribute(func, functionImport['function'])

            if (typeof functionImport.includeInServiceDocument !== 'undefined')
                xml.addAttribute(xml.declareAttribute('IncludeInServiceDocument'), functionImport.includeInServiceDocument.toString())

            this.buildAnnotations(xml, functionImport.annotations)

            xml.endElementInline();
        })
    }



    buildSchemaAnnotations(xml: Xml.XmlCreator, schemaAnnotations: Edm.Annotations[]) {
        schemaAnnotations && schemaAnnotations.forEach(schemaAnnotation => {
            var target = xml.declareAttribute('Target');
            var AnnotationsElement = xml.declareElement('Annotations');
            xml.startElement(AnnotationsElement)
                .addAttribute(target, schemaAnnotation.target)

            if (schemaAnnotation.qualifier)
                xml.addAttribute(xml.declareAttribute('Qualifier'), schemaAnnotation.qualifier)

            this.buildAnnotations(xml, schemaAnnotation.annotations)

            xml.endElementInline();
        })
    }

    buildAnnotations(xml: Xml.XmlCreator, annotations: Edm.Annotation[]) {
        annotations && annotations.forEach(annotation => {
            var AnnotationElement = xml.declareElement('Annotation');

            xml.startElement(AnnotationElement)

            var attributes = Object.keys(this.annotationAttributes);
            attributes.forEach(prop => {
                if (typeof annotation[prop] !== 'undefined' && annotation[prop] !== null) {
                    var attr = xml.declareAttribute(this.annotationAttributes[prop].name)
                    xml.addAttribute(attr, annotation[prop].toString());
                }
            });

            var annotConfig = this.annotationTypes[annotation.annotationType]
            if (annotConfig) {
                if (annotConfig.handler) {
                    annotConfig.handler(xml, annotation)
                } else if (annotConfig.valueField) {
                    var value = annotation[annotConfig.valueField]
                    if (Array.isArray(value)) {
                        this.buildCollectionAnnotation(xml, value, annotConfig, annotation)
                    }
                    else if (typeof value !== 'undefined' && value !== null) {
                        var attr = xml.declareAttribute(annotConfig.name)
                        xml.addAttribute(attr, value.toString());
                    }
                }
            }

            xml.endElementInline();
        })
    }

    buildCollectionAnnotation(xml: Xml.XmlCreator, value: any[], annotConfig: any, _: Edm.Annotation) {
        var collectionElement = xml.declareElement('Collection');
        xml.startElement(collectionElement)

        value.forEach(v => {
            var valueElement = xml.declareElement(annotConfig.name);
            xml.startElement(valueElement)
                .addText(v.toString())
                .endElementInline();
        })
        xml.endElementInline();
    }

    annotationAttributes: Object = {
        term: { name: 'Term' },
        qualifier: { name: 'Qualifier' },
        path: { name: 'Path' },
    }
    annotationTypes: Object = {
        Binary: { name: 'Binary', valueField: 'binary' },
        Bool: { name: 'Bool', valueField: 'bool' },
        Date: { name: 'Date', valueField: 'date' },
        DateTimeOffset: { name: 'DateTimeOffset', valueField: 'dateTimeOffset' },
        Decimal: { name: 'Decimal', valueField: 'decimal' },
        Duration: { name: 'Duration', valueField: 'duration' },
        EnumMember: { name: 'EnumMember', valueField: 'enumMember' },
        Float: { name: 'Float', valueField: 'float' },
        Guid: { name: 'Guid', valueField: 'guid' },
        Int: { name: 'Int', valueField: 'int' },
        String: { name: 'String', valueField: 'string' },
        TimeOfDay: { name: 'TimeOfDay', valueField: 'timeOfDay' },
        PropertyPath: { name: 'PropertyPath', valueField: 'propertyPaths' },
        NavigationPropertyPath: { name: 'NavigationPropertyPath', valueField: 'navigationPropertyPaths' },
        AnnotationPath: { name: 'AnnotationPath', valueField: 'annotationPaths' },
        Null: {
            name: 'Null',
            handler: (xml) => {
                var nullElement = xml.declareElement('Null');
                xml.startElement(nullElement)
                xml.endElementInline();
            }
        }
    }
}