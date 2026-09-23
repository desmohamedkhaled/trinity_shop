# Trinity QA Test Matrix

Status values are evidence-based: PASS, FAIL, BLOCKED, NOT EXECUTED, or NOT APPLICABLE.

| Area | Scenario IDs | Test IDs | Automated | Current status |
|---|---|---|---|---|
| Public routes/navigation | S-PUB-001..003, S-PUB-016 | TC-PUBLIC-001, TC-PUBLIC-002, TC-SEO-001 | Node HTTP smoke | PASS for 13 sampled routes; browser detail coverage blocked |
| Products/catalog | S-PUB-003..005, S-ADM-003..004 | TC-PRODUCT-001..003 | No browser/integration runner | BLOCKED/NOT EXECUTED |
| Occasions/media | S-PUB-006, S-ADM-005, S-ADM-007 | TC-OCC-001..002 | No Storage/auth runner | BLOCKED |
| Events | S-PUB-007, S-ADM-006 | TC-EVENT-001 | No authenticated runner | BLOCKED |
| Gift Finder | S-PUB-008, S-ADM-012 | S-PUB-008, S-ADM-012 | No authenticated runner | BLOCKED |
| Wishlist/Gift Lists | S-PUB-009, S-ADM-010 | TC-WISH-001 | No browser runner | BLOCKED |
| Cart/checkout/WhatsApp | S-PUB-010..012 | TC-CHECK-001 | No integration runner | BLOCKED |
| Contact/FAQ/policies | S-PUB-013..015 | TC-CONTACT-001, TC-FAQ-001 | Partial browser spot checks | FAQ PASS; Contact partial; policy route PASS |
| Admin auth/RBAC | S-ADM-001..002, S-ADM-015, S-SEC-001..002 | TC-AUTH-001, TC-RBAC-001..002 | Unauthenticated HTTP only | Protected API PASS; role tests BLOCKED |
| Orders/customers | S-ADM-008..009 | TC-ORD-001, TC-CUST-001..002 | No isolated data/auth runner | BLOCKED |
| CMS/homepage | S-ADM-011 | TC-CMS-001 | No authenticated browser runner | BLOCKED |
| Settings | S-ADM-013 | TC-SET-001 | Public settings HTTP only | Public endpoint PASS; admin persistence BLOCKED |
| RLS/security | S-SEC-002 | TC-RLS-001 | Not available | NOT EXECUTED |
| Responsive | All public/admin surfaces | TC-RESP-001 | Integrated browser spot checks | Partial: Contact/FAQ/policy verified at 320px; full matrix NOT EXECUTED |
| Accessibility | Public forms/FAQ/dialogs | TC-FAQ-001, TC-CONTACT-001 | Manual browser spot checks | FAQ state PASS; full axe NOT EXECUTED |
| Performance | Video/images/Supabase | TC-PERF-001 | Lighthouse unavailable | NOT EXECUTED |
| Cross-browser | Public/admin | All browser cases | No Playwright installed | NOT EXECUTED |
