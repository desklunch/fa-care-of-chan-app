# Audit Coverage Report

**Generated:** January 8, 2026  
**Status:** Review Complete

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total API Routes | 204 |
| Mutating Routes (POST/PATCH/PUT/DELETE) | 120 |
| Routes with Audit Logging | 62 (52%) |
| Routes Missing Audit Logging | 58 (48%) |

---

## Coverage by Priority

### Priority 1: SKIP - Not Security-Relevant

These routes are either read operations (using POST for complex queries) or high-volume analytics that would create excessive noise:

| Line | Route | Reason to Skip |
|------|-------|----------------|
| 1331 | POST /api/places/text-search | Read operation (search) |
| 1490 | POST /api/places/city-search | Read operation (search) |
| 1593 | POST /api/places/location-search | Read operation (search) |
| 1765 | POST /api/places/refresh | External API call, not data mutation |
| 5239 | POST /api/venues/tag-suggestions | AI suggestion, not data mutation |
| 4574 | POST /api/activity/session | Analytics - high volume, low security value |
| 4610 | POST /api/activity/pageview | Analytics - high volume, low security value |
| 4639 | PUT /api/activity/pageview/:id/duration | Analytics - high volume, low security value |
| 4657 | POST /api/activity/event | Analytics - high volume, low security value |
| 4689 | POST /api/activity/session/:id/end | Analytics - high volume, low security value |

**Recommendation:** Document as intentionally excluded from audit trail.

---

### Priority 2: HIGH - Core Business Data

These routes handle critical business data and should have audit logging:

#### Venue Collections (Lines 2930-3030)
| Line | Route | Action Needed |
|------|-------|---------------|
| 2930 | POST /api/venue-collections | Add create audit |
| 2952 | PATCH /api/venue-collections/:id | Add update audit |
| 2979 | DELETE /api/venue-collections/:id | Add delete audit |
| 2990 | POST /api/venue-collections/:id/venues | Add venue-add audit |
| 3016 | DELETE /api/venue-collections/:collectionId/venues/:venueId | Add venue-remove audit |
| 3030 | PUT /api/venue-collections/:id/reorder | Add reorder audit |

#### Floorplans (Lines 3076-3166)
| Line | Route | Action Needed |
|------|-------|---------------|
| 3076 | POST /api/venues/:venueId/floorplans | Add create audit |
| 3144 | PATCH /api/floorplans/:id | Add update audit |
| 3166 | DELETE /api/floorplans/:id | Add delete audit |

#### Venue Files (Lines 3230-3428)
| Line | Route | Action Needed |
|------|-------|---------------|
| 3230 | POST /api/venue-files/upload | Add upload audit |
| 3330 | POST /api/venues/:venueId/files | Add create audit |
| 3406 | PATCH /api/venue-files/:id | Add update audit |
| 3428 | DELETE /api/venue-files/:id | Add delete audit |

#### Photos (Lines 2089-2275)
| Line | Route | Action Needed |
|------|-------|---------------|
| 2089 | POST /api/photos/upload-url | Add upload audit |
| 2117 | POST /api/photos/from-url | Add upload audit |
| 2192 | POST /api/photos/upload | Add upload audit |
| 2247 | DELETE /api/photos | Add delete audit |
| 2275 | POST /api/floorplans/upload | Add upload audit |

#### Deal Tasks (Lines 5420-5450)
| Line | Route | Action Needed |
|------|-------|---------------|
| 5420 | POST /api/deals/:dealId/tasks | Add create audit |
| 5434 | PATCH /api/deals/:dealId/tasks/:taskId | Add update audit |
| 5450 | DELETE /api/deals/:dealId/tasks/:taskId | Add delete audit |

#### Comments (Lines 4464-4536)
| Line | Route | Action Needed |
|------|-------|---------------|
| 4464 | POST /api/comments | Add create audit |
| 4498 | PATCH /api/comments/:id | Add update audit |
| 4536 | DELETE /api/comments/:id | Add delete audit |

---

### Priority 3: MEDIUM - Admin Reference Data

These routes manage system configuration and reference data:

#### Vendor Services (Lines 1143-1174)
| Line | Route | Action Needed |
|------|-------|---------------|
| 1143 | POST /api/vendor-services | Add create audit |
| 1157 | PATCH /api/vendor-services/:id | Add update audit |
| 1174 | DELETE /api/vendor-services/:id | Add delete audit |

#### Amenities (Lines 3502-3527)
| Line | Route | Action Needed |
|------|-------|---------------|
| 3502 | POST /api/amenities | Add create audit |
| 3513 | PATCH /api/amenities/:id | Add update audit |
| 3527 | DELETE /api/amenities/:id | Add delete audit |

#### Industries (Lines 3565-3604)
| Line | Route | Action Needed |
|------|-------|---------------|
| 3565 | POST /api/industries | Add create audit |
| 3583 | PATCH /api/industries/:id | Add update audit |
| 3604 | DELETE /api/industries/:id | Add delete audit |

#### Deal Services (Lines 3642-3681)
| Line | Route | Action Needed |
|------|-------|---------------|
| 3642 | POST /api/deal-services | Add create audit |
| 3660 | PATCH /api/deal-services/:id | Add update audit |
| 3681 | DELETE /api/deal-services/:id | Add delete audit |

#### Tags (Lines 3720-3759)
| Line | Route | Action Needed |
|------|-------|---------------|
| 3720 | POST /api/tags | Add create audit |
| 3738 | PATCH /api/tags/:id | Add update audit |
| 3759 | DELETE /api/tags/:id | Add delete audit |

#### Release Management (Lines 5068-5193)
| Line | Route | Action Needed |
|------|-------|---------------|
| 5068 | POST /api/releases/:id/features | Add feature-link audit |
| 5096 | DELETE /api/releases/:id/features/:featureId | Add feature-unlink audit |
| 5116 | POST /api/releases/:id/issues | Add issue-link audit |
| 5144 | DELETE /api/releases/:id/issues/:issueId | Add issue-unlink audit |
| 5164 | POST /api/releases/:id/changes | Add change-add audit |
| 5193 | DELETE /api/releases/:id/changes/:changeId | Add change-remove audit |

---

### Priority 4: LOW - Edge Cases

#### Feature Voting (Line 838)
| Line | Route | Action Needed |
|------|-------|---------------|
| 838 | POST /api/features/:id/vote | Consider adding vote audit (high volume) |

#### Public/External Routes
| Line | Route | Action Needed |
|------|-------|---------------|
| 2600 | POST /api/vendor-update/:token | Public form - add audit with token context |
| 4394 | POST /api/form/:token | Public form - add audit with token context |

---

## Implementation Recommendations

### Phase A: High Priority (24 routes)
1. Venue Collections (6 routes)
2. Floorplans (3 routes)
3. Venue Files (4 routes)
4. Photos (5 routes)
5. Deal Tasks (3 routes)
6. Comments (3 routes)

### Phase B: Medium Priority (18 routes)
1. Vendor Services (3 routes)
2. Amenities (3 routes)
3. Industries (3 routes)
4. Deal Services (3 routes)
5. Tags (3 routes)
6. Release Management (6 routes)

### Phase C: Edge Cases (3 routes)
1. Feature voting (optional)
2. Public form submissions (2 routes)

### Document as Excluded (10 routes)
- Places search operations (4)
- Tag suggestions (1)
- Activity tracking (5)

---

## Next Steps

1. **Approve this report** - Confirm priority categorization
2. **Implement Phase A** - Add audit logging to high-priority routes
3. **Implement Phase B** - Add audit logging to medium-priority routes
4. **Document exclusions** - Add comments to excluded routes explaining why

**Estimated effort:** 
- Phase A: ~2 hours
- Phase B: ~1.5 hours
- Phase C: ~30 minutes
