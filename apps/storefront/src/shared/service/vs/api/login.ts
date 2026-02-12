import { BigCommerceStorefrontAPIBaseURL, platform } from '../../../../utils/basicConfig';

export const getVSCurrentCustomerJWT = async (app_client_id: string) => {
  if (platform !== 'bigcommerce') {
    // we can't get a JWT from BC because of CORS, so we return a pre-built JWT
    // for bbogovich@vividsites.com (customer ID 1) for the Star sandbox (euankjadea)
    // that expires on 8/26/2035
    return "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.eyJjdXN0b21lciI6eyJpZCI6NjQsImVtYWlsIjoiQmxpc2hNaXplQ29tcGFueTExMjY3MFVTRVJAQ3Jvd25wYWNrLm5ldCIsImdyb3VwX2lkIjoiNDUifSwiaXNzIjoiYmMvYXBwcyIsInN1YiI6InR3ZnRndHl2Y2ciLCJpYXQiOjE3NzA5Mjg3NjIsImV4cCI6MTc3MTAxNTE1MywidmVyc2lvbiI6MSwiYXVkIjoicmV3ZmVhNm05ZW5senMxZWxxNmM1aWZkaHo5cm1lOCIsImFwcGxpY2F0aW9uX2lkIjoicmV3ZmVhNm05ZW5senMxZWxxNmM1aWZkaHo5cm1lOCIsInN0b3JlX2hhc2giOiJ0d2Z0Z3R5dmNnIiwib3BlcmF0aW9uIjoiY3VycmVudF9jdXN0b21lciJ9.uuYJHg8fy3ljQ1rABEOMi9r-kB6qPUnSmb7YkWZ4dHMAUQv6oRWeJRtXLdw8ipiFHUs8Wp_MTNxWNZ1FRkRLzw";
  }
  const response = await fetch(
    `${BigCommerceStorefrontAPIBaseURL}/customer/current.jwt?app_client_id=${app_client_id}`,
  );
  const bcToken = await response.text();
  if (!response.ok) {
    if (bcToken.includes('errors')) {
      return undefined;
    }
    throw new Error(response.statusText);
  }
  return bcToken;
};