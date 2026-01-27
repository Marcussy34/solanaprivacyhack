use dep::std;
use poseidon::poseidon::bn254::hash_2;

fn main(
    // Private inputs
    seed: Field,
    shuffled_deck: [u8; 52],
    blinding_factor: Field,

    // Public inputs
    deck_commitment: pub Field,
    card_commitment: pub Field,
    card_position: pub Field
) -> pub Field {
    // 1. Verify deck commitment matches the shuffled deck.
    //    Must use the same commitment scheme as shuffle_proof:
    //    commitment = Chain(seed, deck[0], ..., deck[51])
    let mut computed_deck_commitment = seed;
    for i in 0..52 {
        computed_deck_commitment = hash_2([computed_deck_commitment, shuffled_deck[i] as Field]);
    }
    assert(computed_deck_commitment == deck_commitment);

    // 2. Extract card at the specified position (0-51)
    assert(card_position as u8 < 52);
    let mut card_value: Field = 0;
    for i in 0..52 {
        if i as Field == card_position {
            card_value = shuffled_deck[i] as Field;
        }
    }

    // 3. Verify card commitment = Poseidon(card_value, blinding_factor)
    let computed_card_commitment = hash_2([card_value, blinding_factor]);
    assert(computed_card_commitment == card_commitment);

    // Return the card commitment for on-chain verification
    computed_card_commitment
}

#[test]
fn test_deal_card_at_position_0() {
    // Same deck as shuffle_proof test
    let seed: Field = 12345;
    let mut shuffled: [u8; 52] = [0; 52];
    for i in 0..52 {
        shuffled[i] = ((i + 5) % 52) as u8; // Just some shuffle
    }
    let position: Field = 0;
    let blinding: Field = 99999;

    // Card at position 0
    let card_value: Field = shuffled[0] as Field;

    // Compute deck commitment (same as shuffle_proof)
    let mut deck_comm = seed;
    for i in 0..52 {
        deck_comm = hash_2([deck_comm, shuffled[i] as Field]);
    }

    // Compute card commitment
    let card_comm = hash_2([card_value, blinding]);

    let result = main(seed, shuffled, blinding, deck_comm, card_comm, position);
    assert(result == card_comm);
}
