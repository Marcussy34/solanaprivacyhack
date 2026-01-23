use poseidon::poseidon::bn254::hash_2;

fn main(
    // Private inputs
    blinding_factor: Field,
    // Public inputs
    card_value: pub Field,
    card_commitment: pub Field
) -> pub Field {
    // 1. Range check: card value must be 0-12
    assert(card_value as u8 < 13);

    // 2. Compute commitment using same scheme as deal_proof
    let computed_commitment = hash_2([card_value, blinding_factor]);

    // 3. Verify commitment matches
    assert(computed_commitment == card_commitment);

    // Return the computed commitment for on-chain verification
    computed_commitment
}

#[test]
fn test_valid_reveal() {
    // Card at position 0 in deal_proof: value=5, blinding=99999
    let blinding: Field = 99999;
    let card_value: Field = 5;
    let card_comm = hash_2([card_value, blinding]);

    let result = main(blinding, card_value, card_comm);
    assert(result == card_comm);
}

#[test]
fn test_valid_reveal_different_card() {
    // Card at position 4 in deal_proof: value=8, blinding=77777
    let blinding: Field = 77777;
    let card_value: Field = 8;
    let card_comm = hash_2([card_value, blinding]);

    let result = main(blinding, card_value, card_comm);
    assert(result == card_comm);
}

#[test]
fn test_valid_reveal_last_card() {
    // Card at position 12 in deal_proof: value=7, blinding=55555
    let blinding: Field = 55555;
    let card_value: Field = 7;
    let card_comm = hash_2([card_value, blinding]);

    let result = main(blinding, card_value, card_comm);
    assert(result == card_comm);
}

#[test(should_fail)]
fn test_wrong_card_value() {
    // Commitment is for card=5, but we claim card=6
    let blinding: Field = 99999;
    let real_card: Field = 5;
    let wrong_card: Field = 6;
    let card_comm = hash_2([real_card, blinding]);

    let _ = main(blinding, wrong_card, card_comm);
}

#[test(should_fail)]
fn test_wrong_blinding() {
    // Correct card but wrong blinding factor
    let correct_blinding: Field = 99999;
    let wrong_blinding: Field = 11111;
    let card_value: Field = 5;
    let card_comm = hash_2([card_value, correct_blinding]);

    let _ = main(wrong_blinding, card_value, card_comm);
}
