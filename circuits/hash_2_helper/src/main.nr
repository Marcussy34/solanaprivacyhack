// Hash Helper Circuit - Computes Poseidon hash of 2 elements.
// Used to compute card commitments in JavaScript without assertions.
//
// Card commitment = Poseidon(card_value, blinding_factor)
//
// This circuit takes all inputs as PRIVATE so they don't appear in
// publicInputs. Only the computed hash is returned as public output.
//
// Usage: Execute this circuit via NoirJS to compute card commitments.
//
// @author Marcus (ZK Engineer)
// @created Jan 23, 2026

use poseidon::poseidon::bn254::hash_2;

fn main(
    // All inputs are PRIVATE (not pub)
    element_0: Field,  // card_value
    element_1: Field,  // blinding_factor
) -> pub Field {
    // Compute and return the Poseidon hash
    hash_2([element_0, element_1])
}

#[test]
fn test_card_commitment() {
    // Same test values as deal_proof
    let card_value: Field = 5;
    let blinding: Field = 99999;

    let result = main(card_value, blinding);

    // Expected commitment from deal_proof test
    let expected: Field = 0x09855b336da066bd39ba5aa3478eb124515980d53118c0adcc232704bfad552b;
    assert(result == expected);
}

#[test]
fn test_different_card() {
    // Card at position 4 (value 8) with blinding 77777
    let card_value: Field = 8;
    let blinding: Field = 77777;

    let result = main(card_value, blinding);

    // Just verify it returns something (we don't have expected value)
    assert(result != 0);
}


