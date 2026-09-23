# Trinity QA Traceability Matrix

| Requirement / feature | Scenario IDs | Test Case IDs | Automated? | Status |
|---|---|---|---|---|
| Homepage and intro video | S-PUB-001 | TC-PUBLIC-001 | HTTP partial | Homepage PASS; intro full behavior BLOCKED |
| Logo/navigation/footer | S-PUB-002, S-PUB-016 | TC-PUBLIC-002 | HTTP partial | Public route smoke PASS; full browser NOT EXECUTED |
| Shop/products/gallery | S-PUB-003..005, S-ADM-003..004 | TC-PUBLIC-002, TC-PRODUCT-001..003 | No browser runner | BLOCKED |
| Occasions | S-PUB-006, S-ADM-005 | TC-OCC-001..002 | No authenticated Storage runner | BLOCKED |
| Events | S-PUB-007, S-ADM-006 | TC-EVENT-001 | No authenticated runner | BLOCKED |
| Gift Finder | S-PUB-008, S-ADM-012 | S-PUB-008, S-ADM-012 | No authenticated runner | BLOCKED |
| Gift Lists/Wishlist | S-PUB-009, S-ADM-010 | TC-WISH-001 | No browser runner | BLOCKED |
| Cart/checkout/WhatsApp | S-PUB-010..012 | TC-CHECK-001 | No integration runner | BLOCKED |
| Contact | S-PUB-013 | TC-CONTACT-001 | Partial browser | PARTIAL |
| FAQ | S-PUB-014 | TC-FAQ-001 | Browser spot check | PASS |
| Shipping & Returns | S-PUB-015 | TC-PUBLIC-001 | HTTP/browser spot check | PASS |
| Admin login/session | S-ADM-001 | TC-AUTH-001 | No auth runner | BLOCKED |
| RBAC/admin navigation | S-ADM-002, S-ADM-015 | TC-RBAC-001..002 | Unauthenticated API only | Protected API PASS; role tests BLOCKED |
| Orders/status | S-ADM-008 | TC-ORD-001 | No isolated data | BLOCKED |
| Customers/merge/history/delete | S-ADM-009 | TC-CUST-001..002 | No isolated data | BLOCKED |
| Homepage CMS | S-ADM-011 | TC-CMS-001 | No auth browser | BLOCKED |
| Settings/phone/WhatsApp | S-ADM-013 | TC-SET-001 | Public API only | PARTIAL |
| Storage/RLS | S-SEC-002, S-ADM-005, S-ADM-007 | TC-RLS-001, TC-OCC-001..002 | No isolated Supabase | NOT EXECUTED |
| Responsive behavior | All public/admin | TC-RESP-001 | Partial browser | Contact/FAQ/policy spot checks PASS; full matrix NOT EXECUTED |
| Accessibility | Public forms/FAQ/dialogs | TC-FAQ-001, TC-CONTACT-001 | Manual partial | Partial |
| Performance/SEO | S-PERF-001, S-PUB-016 | TC-PERF-001, TC-SEO-001 | Static/build partial | Performance NOT EXECUTED; route builds PASS |
