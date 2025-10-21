import B3Request from '../../request/b3Fetch';

const customFields = (data: CustomFieldItems) => `query getCustomFields {
  site {
    products(entityIds: [${data.productIds || []}]${data.pageSize ? `, first:${data.pageSize || null}` : ''}${data.cursor ? `, after:"${data.cursor || null}"` : ''}) {
      edges {
        node {
          customFields {
            edges {
              node {
                name
                value
              }
            }
          }
          entityId
        }
      }
      pageInfo {
        hasNextPage
        startCursor
        endCursor
        hasPreviousPage
      }
    }
  }
}`;

const getCustomFields = (data: CustomFieldItems) =>
  B3Request.graphqlBCProxy({
    query: customFields(data),
  });

export { getCustomFields };
