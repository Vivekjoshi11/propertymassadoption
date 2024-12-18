export interface JSONMetadata {
    name: string
    description: string
    image?: string
    external_url: string
    attributes: Array<{
        trait_type: string
        value: string
    }>
}
export type ipfsVertexesAttributes = { trait_type: string; value: string }
export type offChainMetadata = {
    name: string
    symbol: string
    description: string
    image: string
    external_url: string
    metadata: JSONMetadata
}
