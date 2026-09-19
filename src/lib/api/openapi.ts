/** OpenAPI 3.1 document for the connector REST API. Hand-written so it stays honest to the routes. */
export function openapi(origin: string) {
  const bearer = [{ bearerAuth: [] }];
  const idParam = { name: "id", in: "path", required: true, schema: { type: "string" }, description: "Application id" };
  const summaryRef = { $ref: "#/components/schemas/ApplicationSummary" };
  const ok = (schema: unknown, description = "OK") => ({ description, content: { "application/json": { schema } } });
  const err = { $ref: "#/components/responses/Error" };
  return {
    openapi: "3.1.0",
    info: {
      title: "Auto Apply connector API",
      version: "1.0.0",
      description: [
        "Prepare job applications for a signed-in user: paste a Greenhouse, Lever or Ashby posting link, get a one-page resume tailored from the user's own profile (nothing invented), the PDF, and the answers to the form's questions.",
        "Typical agent flow: POST /applications with the link, poll GET /applications/{id} until status is `ready`, ask the user the questions with `needsHuman: true` and POST them to /answers, GET /applications/{id}/form for everything needed to fill the form, fill and submit it in the browser (upload the PDF from `resumePdfUrl`), then POST /applications/{id}/submitted.",
        "Authenticate with `Authorization: Bearer <personal API key>` from the app's Connect page, or with a Clerk OAuth 2.1 access token. An MCP server with the same capabilities is at /mcp."
      ].join("\n\n")
    },
    servers: [{ url: `${origin}/api/v1` }],
    security: bearer,
    tags: [{ name: "applications" }, { name: "discovery" }, { name: "profile" }, { name: "account" }],
    paths: {
      "/me": { get: { tags: ["account"], summary: "Who am I", operationId: "getMe", responses: { 200: ok({ type: "object", properties: { userId: { type: "string" }, hasProfile: { type: "boolean" }, name: { type: "string" }, applications: { type: "integer" } } }), 401: err } } },
      "/jobs/search": { get: { tags: ["discovery"], summary: "Search open roles across supported boards", operationId: "searchJobs", parameters: [{ name: "q", in: "query", required: true, schema: { type: "string" }, description: "Title words" }, { name: "location", in: "query", schema: { type: "string" }, description: "City, country, India or Remote" }, { name: "limit", in: "query", schema: { type: "integer", maximum: 100 } }, { name: "boards", in: "query", schema: { type: "string" }, description: "Comma-separated: greenhouse,lever,ashby" }], responses: { 200: ok({ type: "object", properties: { openRoles: { type: "integer" }, companies: { type: "integer" }, results: { type: "array", items: { type: "object", properties: { board: { type: "string" }, company: { type: "string" }, id: { type: "string" }, title: { type: "string" }, location: { type: "string" }, remote: { type: "boolean" }, url: { type: "string", description: "Accepted by POST /applications" }, postedAt: { type: "string" } } } } } }), 400: err } } },
      "/companies": {
        get: { tags: ["discovery"], summary: "Companies with a supported job board", operationId: "listCompanies", parameters: [{ name: "board", in: "query", schema: { type: "string", enum: ["greenhouse", "lever", "ashby"] } }], responses: { 200: ok({ type: "object", properties: { companies: { type: "array", items: { type: "object", properties: { board: { type: "string" }, token: { type: "string" }, name: { type: "string" }, careersUrl: { type: "string" } } } } } }) } },
        post: { tags: ["discovery"], summary: "Add a company by careers URL", operationId: "addCompany", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["careersUrl"], properties: { careersUrl: { type: "string" } } } } } }, responses: { 200: ok({ type: "object" }), 400: err } }
      },
      "/applications": {
        get: { tags: ["applications"], summary: "List applications", operationId: "listApplications", parameters: [{ name: "status", in: "query", schema: { $ref: "#/components/schemas/Status" } }], responses: { 200: ok({ type: "object", properties: { applications: { type: "array", items: summaryRef } } }), 401: err } },
        post: { tags: ["applications"], summary: "Prepare an application from a job link", description: "Returns at once with status `queued`. The resume is usually ready in about a minute; poll GET /applications/{id}.", operationId: "prepareApplication", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["url"], properties: { url: { type: "string", format: "uri", description: "Greenhouse, Lever or Ashby job posting link" } } } } } }, responses: { 202: ok(summaryRef, "Accepted"), 400: err, 401: err, 409: ok({ $ref: "#/components/schemas/ErrorBody" }, "No profile yet") } }
      },
      "/applications/{id}": {
        parameters: [idParam],
        get: { tags: ["applications"], summary: "Get an application", operationId: "getApplication", parameters: [{ name: "resume", in: "query", schema: { type: "string", enum: ["1"] }, description: "Include the tailored resume content" }], responses: { 200: ok(summaryRef), 404: err } },
        delete: { tags: ["applications"], summary: "Delete an application", operationId: "deleteApplication", responses: { 200: ok({ type: "object", properties: { ok: { type: "boolean" }, id: { type: "string" } } }), 404: err } }
      },
      "/applications/{id}/answers": { parameters: [idParam], post: { tags: ["applications"], summary: "Save the user's answers to open form questions", description: "Keys are question ids or labels. Ask the user; never guess.", operationId: "answerQuestions", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["answers"], properties: { answers: { type: "object", additionalProperties: { type: "string" } } } } } } }, responses: { 200: ok(summaryRef), 400: err, 404: err } } },
      "/applications/{id}/form": { parameters: [idParam], get: { tags: ["applications"], summary: "Everything needed to fill the form", description: "Apply URL, contact fields, every question with its value, a 24-hour link to the PDF, and filling instructions. 409 while questions are open unless allowOpen=1.", operationId: "getFormAnswers", parameters: [{ name: "allowOpen", in: "query", schema: { type: "string", enum: ["1"] } }], responses: { 200: ok({ $ref: "#/components/schemas/FormAnswers" }), 409: err } } },
      "/applications/{id}/pdf": { parameters: [idParam], get: { tags: ["applications"], summary: "The tailored resume PDF", description: "Bearer token, or the signed link given as `resumePdfUrl` (no token needed).", operationId: "getResumePdf", security: [{ bearerAuth: [] }, {}], responses: { 200: { description: "PDF", content: { "application/pdf": { schema: { type: "string", format: "binary" } } } }, 401: err, 404: err } } },
      "/applications/{id}/submitted": { parameters: [idParam], post: { tags: ["applications"], summary: "Mark as submitted", description: "Call after you submit a form you filled yourself.", operationId: "markSubmitted", requestBody: { content: { "application/json": { schema: { type: "object", properties: { note: { type: "string" } } } } } }, responses: { 200: ok(summaryRef), 409: err } } },
      "/applications/{id}/approve": { parameters: [idParam], post: { tags: ["applications"], summary: "Approve for the user's desktop runner", description: "Alternative to filling the form yourself: the runner on the user's machine fills the form in a visible browser and waits for the user's Submit.", operationId: "approveApplication", responses: { 200: ok(summaryRef), 409: err } } },
      "/applications/{id}/regenerate": { parameters: [idParam], post: { tags: ["applications"], summary: "Rewrite the resume", operationId: "regenerateResume", requestBody: { content: { "application/json": { schema: { type: "object", properties: { notes: { type: "string", description: "What to change, e.g. 'lead with the payments project'" } } } } } }, responses: { 202: ok(summaryRef, "Accepted"), 409: err } } },
      "/profile": {
        get: { tags: ["profile"], summary: "Master profile", description: "The only facts the resume writer may use.", operationId: "getProfile", responses: { 200: ok({ $ref: "#/components/schemas/Profile" }), 404: err } },
        put: { tags: ["profile"], summary: "Replace the master profile", operationId: "updateProfile", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/Profile" } } } }, responses: { 200: ok({ $ref: "#/components/schemas/Profile" }), 400: err } }
      },
      "/profile/import": { post: { tags: ["profile"], summary: "Build the profile from resume text", operationId: "importResume", requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["text"], properties: { text: { type: "string", minLength: 200 }, mode: { type: "string", enum: ["merge", "replace"], default: "merge" } } } }, "text/plain": { schema: { type: "string" } } } }, responses: { 200: ok({ $ref: "#/components/schemas/Profile" }), 400: err } } },
      "/answers": {
        get: { tags: ["profile"], summary: "Known form answers", description: "Contact details and standing answers (work authorization, sponsorship, relocation, notice period, salary, how they heard).", operationId: "getKnownAnswers", responses: { 200: ok({ $ref: "#/components/schemas/KnownAnswers" }) } },
        patch: { tags: ["profile"], summary: "Update known form answers", operationId: "updateKnownAnswers", requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/KnownAnswers" } } } }, responses: { 200: ok({ $ref: "#/components/schemas/KnownAnswers" }), 400: err } }
      }
    },
    components: {
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", description: "Personal API key from the Connect page, or a Clerk OAuth access token" } },
      responses: { Error: { description: "Error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorBody" } } } } },
      schemas: {
        ErrorBody: { type: "object", properties: { error: { type: "string" } }, required: ["error"] },
        Status: { type: "string", enum: ["queued", "fetching", "unsupported", "tailoring", "rendering", "ready", "approved", "filling", "filled", "submit_requested", "code_required", "submitted", "failed"] },
        Question: { type: "object", properties: { id: { type: "string" }, label: { type: "string" }, type: { type: "string", enum: ["text", "textarea", "select", "multiselect", "file", "checkbox", "unknown"] }, required: { type: "boolean" }, options: { type: "array", items: { type: "string" } }, answer: { type: "string" }, source: { type: "string", enum: ["profile", "rule", "user"] }, needsHuman: { type: "boolean", description: "True when the user has to answer this" } } },
        ApplicationSummary: { type: "object", properties: { id: { type: "string" }, url: { type: "string" }, status: { $ref: "#/components/schemas/Status" }, statusLabel: { type: "string" }, createdAt: { type: "string" }, updatedAt: { type: "string" }, job: { type: "object", properties: { board: { type: "string" }, company: { type: "string" }, title: { type: "string" }, location: { type: "string" }, applyUrl: { type: "string" } } }, headline: { type: "string" }, jdSummary: { type: "string" }, fitNotes: { type: "array", items: { type: "string" } }, matchScore: { type: "object", properties: { tailored: { type: "number", description: "0-100 keyword match of the tailored resume" }, profile: { type: "number", description: "0-100 for the untailored profile" }, missing: { type: "array", items: { type: "string" } } } }, resumePdfUrl: { type: "string", description: "Signed link, valid 24 hours, no token needed" }, resumeWarnings: { type: "array", items: { type: "string" } }, resume: { type: "object", description: "Only with ?resume=1" }, openQuestions: { type: "integer" }, questions: { type: "array", items: { $ref: "#/components/schemas/Question" } }, error: { type: "string" }, submittedAt: { type: "string" }, nextStep: { type: "string", description: "What to do next, in words" }, reviewUrl: { type: "string" } } },
        FormAnswers: { type: "object", properties: { applicationId: { type: "string" }, applyUrl: { type: "string" }, company: { type: "string" }, title: { type: "string" }, resumePdfUrl: { type: "string" }, resumeFileName: { type: "string" }, contact: { $ref: "#/components/schemas/KnownAnswers" }, fields: { type: "array", items: { type: "object", properties: { id: { type: "string" }, label: { type: "string" }, type: { type: "string" }, required: { type: "boolean" }, options: { type: "array", items: { type: "string" } }, value: { type: "string" }, needsHuman: { type: "boolean" } } } }, instructions: { type: "array", items: { type: "string" } } } },
        KnownAnswers: { type: "object", additionalProperties: false, properties: Object.fromEntries(["firstName", "lastName", "email", "phone", "phoneCountry", "location", "gender", "linkedin", "github", "website", "heardFrom", "workAuthorizedCountries", "sponsorshipElsewhere", "needsSponsorship", "willingToRelocate", "openToOnsite", "noticePeriod", "currentCompany", "currentTitle", "yearsExperience", "salaryExpectation", "notifyEmail", "resumeDefault"].map((k) => [k, { type: "string" }])) },
        Profile: {
          type: "object", required: ["name", "education", "roles"],
          properties: {
            name: { type: "string" }, phone: { type: "string" }, email: { type: "string" }, linkedin: { type: "string" }, github: { type: "string" }, website: { type: "string" }, location: { type: "string" }, gender: { type: "string" },
            education: { type: "array", items: { type: "object", required: ["school", "degree"], properties: { school: { type: "string" }, place: { type: "string" }, degree: { type: "string" }, dates: { type: "string" }, gpa: { type: "string" } } } },
            roles: { type: "array", items: { type: "object", required: ["company", "title", "start", "end", "bullets"], properties: { company: { type: "string" }, title: { type: "string" }, location: { type: "string" }, start: { type: "string" }, end: { type: "string" }, bullets: { type: "array", items: { type: "object", required: ["id", "text"], properties: { id: { type: "string" }, tags: { type: "array", items: { type: "string" } }, text: { type: "string", minLength: 20 } } } } } } },
            projects: { type: "array", items: { type: "object", required: ["name", "bullets"], properties: { name: { type: "string" }, stack: { type: "string" }, year: { type: "string" }, tags: { type: "array", items: { type: "string" } }, bullets: { type: "array", items: { type: "string", minLength: 20 } } } } },
            skills: { type: "object", additionalProperties: { type: "array", items: { type: "string" } } },
            coursework: { type: "array", items: { type: "string" } },
            achievements: { type: "array", items: { type: "string" } }
          }
        }
      }
    }
  };
}
