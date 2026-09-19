import { protectedResourceHandlerClerk, metadataCorsOptionsRequestHandler } from "@clerk/mcp-tools/next";

const handler = protectedResourceHandlerClerk({ scopes_supported: ["openid", "profile", "email"] });
const corsHandler = metadataCorsOptionsRequestHandler();

export { handler as GET, corsHandler as OPTIONS };
