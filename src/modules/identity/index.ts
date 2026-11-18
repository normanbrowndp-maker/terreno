/** Auth-library independent identity contract. No authentication is implemented. */
export interface Principal { userId: string }
export interface IdentityReader { currentPrincipal(): Promise<Principal | null> }
