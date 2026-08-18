Feature: Rejecting malformed calls
  As the flight tracker backend
  I want bad arguments refused with a clear reason
  So that a mistake in the caller is obvious rather than silent

  Scenario: A call carrying no usable arguments is rejected
    When I invoke the function with no arguments
    Then the response status should be 400
    And the response body should contain:
      """
      {
        "error": {
          "code": "BAD_REQUEST",
          "message": "Provide slug, or airline and aircraft, or op=configurations.",
          "status": 400
        }
      }
      """

  Scenario: An unknown operation is rejected
    When I invoke the function with "op=teleport"
    Then the response status should be 400
    And the response body should have the property "error.code"

  Scenario: A resolve call missing the aircraft is rejected
    When I invoke the function with "airline=LH"
    Then the response status should be 400
    And the response body should contain:
      """
      {
        "error": {
          "code": "BAD_REQUEST",
          "message": "Parameters airline and aircraft are required for op=resolve.",
          "status": 400
        }
      }
      """

  Scenario: A seatmap call missing the slug is rejected
    When I invoke the function with "op=seatmap"
    Then the response status should be 400
    And the response body should contain:
      """
      {
        "error": {
          "code": "BAD_REQUEST",
          "message": "Parameter slug is required for op=seatmap.",
          "status": 400
        }
      }
      """
