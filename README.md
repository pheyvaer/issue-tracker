# Issue tracker


## Data model

### Work packages

```turtle
@prefix fabio: <http://purl.org/spar/fabio/> .
@prefix wp: <https://data.knows.idlab.ugent.be/work-package/> .
@prefix project: <https://data.knows.idlab.ugent.be/project/> .
@prefix frbr: <http://purl.org/vocab/frbr/core#> .
@prefix schema: <http://schema.org/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .

wp:solidlab-wp-1 a fabio:WorkPackage;
   rdfs:label "WP 1 - Interoperability";
   schema:identifier "1";
   frbr:partOf project:solidlab.
```
